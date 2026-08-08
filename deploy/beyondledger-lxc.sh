#!/usr/bin/env bash
#
# BeyondLedger — Proxmox VE LXC onboarding script
# --------------------------------------------------
# Run this on your PROXMOX HOST shell (as root). It interactively creates an
# unprivileged Debian LXC, then clones + builds + runs BeyondLedger inside it
# under systemd. Inspired by the Proxmox VE Helper-Scripts workflow.
#
#   bash beyondledger-lxc.sh
#
# What it does:
#   1. Asks setup questions (whiptail).
#   2. Downloads a Debian LXC template if needed.
#   3. Creates + starts an unprivileged LXC.
#   4. Installs Node 22, build tools, git.
#   5. Clones your repo, writes .env, runs prisma migrate deploy, next build.
#   6. Installs a systemd service + a `beyondledger-update` helper, starts it.
#
# App reachable at:  http://<container-ip>:<port>
#
set -euo pipefail

# --------------------------------------------------------------------------
# pretty output
# --------------------------------------------------------------------------
BL='\033[36m'; GN='\033[32m'; RD='\033[31m'; YW='\033[33m'; NC='\033[0m'
msg()  { echo -e "${BL}▶${NC} $*"; }
ok()   { echo -e "${GN}✔${NC} $*"; }
warn() { echo -e "${YW}!${NC} $*"; }
die()  { echo -e "${RD}[x]${NC} $*" >&2; exit 1; }

trap 'die "Failed at line $LINENO. Aborting. If a container was partially created, remove it with: pct destroy <CTID>"' ERR

# --------------------------------------------------------------------------
# preflight
# --------------------------------------------------------------------------
[[ $EUID -eq 0 ]]           || die "Run me as root on the Proxmox host."
command -v pct >/dev/null   || die "'pct' not found — this must run on a Proxmox VE host."
command -v pveam >/dev/null || die "'pveam' not found — this must run on a Proxmox VE host."
command -v whiptail >/dev/null || die "'whiptail' not found (apt install whiptail)."

# --------------------------------------------------------------------------
# helpers for whiptail prompts
# --------------------------------------------------------------------------
ask() { # ask <title> <default> ; echoes result, aborts on cancel
  local val
  val=$(whiptail --inputbox "$1" 10 70 "$2" --title "BeyondLedger LXC" 3>&1 1>&2 2>&3) \
    || die "Cancelled."
  echo "$val"
}
ask_pw() {
  whiptail --passwordbox "$1" 10 70 --title "BeyondLedger LXC" 3>&1 1>&2 2>&3 || die "Cancelled."
}
yesno() { whiptail --yesno "$1" 10 70 --title "BeyondLedger LXC"; }

# --------------------------------------------------------------------------
# gather config
# --------------------------------------------------------------------------
NEXTID=$(pvesh get /cluster/nextid 2>/dev/null || echo 100)
CTID=$(ask "Container ID (CTID):" "$NEXTID")
pct status "$CTID" &>/dev/null && die "CTID $CTID already exists. Pick another."

HOSTNAME=$(ask "Hostname:" "beyondledger")
DISK=$(ask "Root disk size (GB):" "10")
RAM=$(ask "RAM (MB)  [build needs ~2048]:" "2048")
SWAP=$(ask "Swap (MB):" "512")
CORES=$(ask "CPU cores:" "2")

# storage pool for the rootfs (must support container images)
STORAGE=$(ask "Storage pool for rootfs:" "local-lvm")
pvesm status -storage "$STORAGE" &>/dev/null || warn "Storage '$STORAGE' not found by pvesm — continuing, pct will validate."

# template storage (where .tar.zst templates live; usually 'local')
TPLSTORE=$(ask "Storage for the LXC template:" "local")
BRIDGE=$(ask "Network bridge:" "vmbr0")

if yesno "Use DHCP for networking?\n\n(No = enter a static IP next.)"; then
  NETCFG="ip=dhcp"
else
  STATIC=$(ask "Static IP in CIDR (e.g. 192.168.1.50/24):" "")
  GW=$(ask "Gateway (e.g. 192.168.1.1):" "")
  NETCFG="ip=${STATIC},gw=${GW}"
fi

ROOTPW=$(ask_pw "Root password for the container:")
[[ -n "$ROOTPW" ]] || die "Root password cannot be empty."

# --- app / git config ---
REPO_URL=$(ask "Git repository URL (https):" "https://github.com/youruser/beyondledger.git")
BRANCH=$(ask "Git branch:" "main")
GIT_TOKEN=$(ask_pw "Git access token for a PRIVATE repo (leave blank if public):" || true)
APP_PORT=$(ask "App port:" "3000")

# build a clone URL that carries the token (only used for the initial clone)
CLONE_URL="$REPO_URL"
if [[ -n "${GIT_TOKEN:-}" && "$REPO_URL" == https://* ]]; then
  CLONE_URL="https://oauth2:${GIT_TOKEN}@${REPO_URL#https://}"
fi

whiptail --title "Confirm" --yesno \
"Create this container?

 CTID:      $CTID
 Hostname:  $HOSTNAME
 Cores/RAM: ${CORES} cores / ${RAM} MB (+${SWAP} swap)
 Disk:      ${DISK} GB on $STORAGE
 Network:   $BRIDGE ($NETCFG)
 Repo:      $REPO_URL ($BRANCH)
 App URL:   http://<ip>:${APP_PORT}" 22 74 || die "Cancelled."

# --------------------------------------------------------------------------
# template
# --------------------------------------------------------------------------
msg "Refreshing template catalog..."
pveam update >/dev/null 2>&1 || true

TEMPLATE=$(pveam available --section system 2>/dev/null | awk '/debian-13-standard/{print $2}' | sort -V | tail -1)
[[ -z "$TEMPLATE" ]] && TEMPLATE=$(pveam available --section system 2>/dev/null | awk '/debian-12-standard/{print $2}' | sort -V | tail -1)
[[ -z "$TEMPLATE" ]] && die "No Debian standard template available via pveam."

if ! pveam list "$TPLSTORE" 2>/dev/null | grep -q "$TEMPLATE"; then
  msg "Downloading template $TEMPLATE to $TPLSTORE ..."
  pveam download "$TPLSTORE" "$TEMPLATE"
fi
TPLREF="${TPLSTORE}:vztmpl/${TEMPLATE}"
ok "Template: $TPLREF"

# --------------------------------------------------------------------------
# create + start container
# --------------------------------------------------------------------------
msg "Creating LXC $CTID ..."
pct create "$CTID" "$TPLREF" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" --memory "$RAM" --swap "$SWAP" \
  --rootfs "${STORAGE}:${DISK}" \
  --net0 "name=eth0,bridge=${BRIDGE},${NETCFG}" \
  --unprivileged 1 \
  --features nesting=1 \
  --ostype debian \
  --onboot 1 \
  --password "$ROOTPW"

msg "Starting container ..."
pct start "$CTID"

# wait for network + DNS inside the container
msg "Waiting for network ..."
for i in $(seq 1 30); do
  if pct exec "$CTID" -- bash -c 'getent hosts deb.debian.org >/dev/null 2>&1'; then break; fi
  sleep 2
  [[ $i -eq 30 ]] && die "Container has no network/DNS after 60s."
done
ok "Network is up."

# --------------------------------------------------------------------------
# generate the in-container setup script and run it
# --------------------------------------------------------------------------
APP_USER="beyondledger"
APP_HOME="/opt/beyondledger"
APP_DIR="${APP_HOME}/app"
DATA_DIR="${APP_HOME}/data"
SETUP="/tmp/bl-setup-${CTID}.sh"

msg "Writing in-container setup script ..."
cat > "$SETUP" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo ">> Installing base packages ..."
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git build-essential python3 >/dev/null

echo ">> Installing Node.js 22 ..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs >/dev/null
echo "   node \$(node -v), npm \$(npm -v)"

echo ">> Creating service user + directories ..."
id ${APP_USER} &>/dev/null || useradd --system --create-home --home-dir ${APP_HOME} --shell /usr/sbin/nologin ${APP_USER}
mkdir -p ${DATA_DIR}/uploads

echo ">> Cloning repository ..."
rm -rf ${APP_DIR}
git clone --branch "${BRANCH}" --depth 1 "${CLONE_URL}" ${APP_DIR}
# strip any token from the stored remote
git -C ${APP_DIR} remote set-url origin "${REPO_URL}"

echo ">> Writing .env ..."
cat > ${APP_DIR}/.env <<ENVEOF
DATABASE_URL=file:${DATA_DIR}/beyondledger.db
FILE_STORAGE_DIR=${DATA_DIR}/uploads
ENVEOF

echo ">> Installing dependencies (npm ci) ..."
cd ${APP_DIR}
npm ci

echo ">> Prisma generate + migrate deploy ..."
npx prisma generate
npx prisma migrate deploy

echo ">> Building (next build) ..."
npm run build

echo ">> Fixing ownership ..."
chown -R ${APP_USER}:${APP_USER} ${APP_HOME}

echo ">> Installing systemd service ..."
cat > /etc/systemd/system/beyondledger.service <<UNITEOF
[Unit]
Description=BeyondLedger (Next.js)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNITEOF

echo ">> Installing 'beyondledger-update' helper ..."
cat > /usr/local/bin/beyondledger-update <<UPDEOF
#!/usr/bin/env bash
# Redeploy latest code: pull, install, migrate, rebuild, restart.
set -euo pipefail
cd ${APP_DIR}
echo ">> git pull ..."
sudo -u ${APP_USER} git pull --ff-only
echo ">> npm ci ..."
sudo -u ${APP_USER} npm ci
echo ">> prisma generate + migrate deploy ..."
sudo -u ${APP_USER} npx prisma generate
sudo -u ${APP_USER} npx prisma migrate deploy
echo ">> build ..."
sudo -u ${APP_USER} npm run build
echo ">> restart ..."
systemctl restart beyondledger
echo ">> done."
UPDEOF
chmod +x /usr/local/bin/beyondledger-update
apt-get install -y -qq sudo >/dev/null || true

echo ">> Enabling + starting service ..."
systemctl daemon-reload
systemctl enable --now beyondledger

echo ">> Setup complete."
EOF

msg "Pushing setup script into container ..."
pct push "$CTID" "$SETUP" /root/bl-setup.sh
rm -f "$SETUP"   # remove token-bearing copy from the host immediately

msg "Running setup inside container (this builds the app — a few minutes) ..."
pct exec "$CTID" -- bash /root/bl-setup.sh
pct exec "$CTID" -- rm -f /root/bl-setup.sh   # remove token-bearing copy from container

# --------------------------------------------------------------------------
# done
# --------------------------------------------------------------------------
IP=$(pct exec "$CTID" -- bash -c "hostname -I | awk '{print \$1}'" | tr -d '[:space:]')

echo
ok "BeyondLedger is deployed!"
echo -e "   ${GN}URL:${NC}      http://${IP}:${APP_PORT}"
echo -e "   ${GN}Container:${NC} CTID $CTID ($HOSTNAME)"
echo
echo "   Useful commands (on the Proxmox host):"
echo "     pct enter $CTID                                  # shell into it"
echo "     pct exec  $CTID -- systemctl status beyondledger # service status"
echo "     pct exec  $CTID -- journalctl -u beyondledger -f # live logs"
echo "     pct exec  $CTID -- beyondledger-update           # pull + rebuild + restart"
echo
echo "   Data (SQLite DB + uploads) lives in the container at:"
echo "     ${DATA_DIR}"
echo "   Back it up with Proxmox: vzdump $CTID"
echo
