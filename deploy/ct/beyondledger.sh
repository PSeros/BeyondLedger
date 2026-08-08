#!/usr/bin/env bash
# BeyondLedger — Proxmox VE Helper-style script (self-hosted)
#
# Sources the community-scripts build.func (all the container-creation +
# whiptail prompts machinery), but redirects ONLY the installer fetch to this
# repo, so it runs deploy/install/beyondledger-install.sh from PSeros/BeyondLedger.
#
# Run on the Proxmox host shell:
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/PSeros/BeyondLedger/main/deploy/ct/beyondledger.sh)"
#
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func \
  | sed 's|community-scripts/ProxmoxVE/main/install/|PSeros/BeyondLedger/main/deploy/install/|g')
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/PSeros/BeyondLedger

APP="BeyondLedger"
var_tags="${var_tags:-finance}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-10}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

# Base language — asked on a FRESH INSTALL only (always, even on default settings). Detected via
# pveversion: install runs on the Proxmox host (pveversion present); an update re-runs this script
# INSIDE the container (no pveversion) and hits update_script instead, where seeding doesn't apply.
if command -v pveversion >/dev/null 2>&1; then
  BL_LOCALE=$(whiptail --backtitle "BeyondLedger" --title "Base Language" --menu \
    $'Select the base language.\n\nSets the UI language and seeds the preconfigured\ncategories (items, suppliers, contracts, income) in it.' \
    13 64 2 "de" "Deutsch" "en" "English" 3>&1 1>&2 2>&3) || BL_LOCALE="de"
  BL_LOCALE="${BL_LOCALE:-de}"
fi

function update_script() {
  header_info
  check_container_storage
  check_container_resources
  if [[ ! -d /opt/beyondledger ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi
  msg_info "Updating ${APP}"
  systemctl stop beyondledger
  cd /opt/beyondledger || exit
  $STD git pull --ff-only
  $STD npm ci
  $STD npx prisma generate
  $STD npx prisma migrate deploy
  $STD npm run build
  systemctl start beyondledger
  msg_ok "Updated ${APP}"
  exit
}

start
build_container
description

# Set the base language and seed the preconfigured categories in that language (idempotent).
# Runs here (not in the installer) because the language choice lives on the host prompt, and
# build.func does not forward custom env into the lxc-attach install.
msg_info "Setting language & seeding categories (${BL_LOCALE})"
if pct exec "$CTID" -- bash -c "cd /opt/beyondledger && APP_LOCALE=${BL_LOCALE} NODE_ENV=production npm run db:init" &>/dev/null; then
  msg_ok "Initialized database (${BL_LOCALE})"
else
  msg_error "Database init failed. Run it manually:\n  pct exec ${CTID} -- bash -c 'cd /opt/beyondledger && APP_LOCALE=${BL_LOCALE} npm run db:init'"
fi

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW}Access it using the following URL:${CL}"
echo -e "${GATEWAY}${BGN}http://${IP}:3000${CL}"
