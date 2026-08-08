#!/usr/bin/env bash
# BeyondLedger — installer (runs INSIDE the LXC, invoked by build.func)
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/PSeros/BeyondLedger

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

APP_DIR="/opt/beyondledger"
DATA_DIR="/opt/beyondledger-data"

msg_info "Installing Dependencies"
$STD apt-get install -y git build-essential python3
msg_ok "Installed Dependencies"

NODE_VERSION="22" setup_nodejs

# Node 22 bundles npm 10.9.x, which cannot read an npm-11-generated
# package-lock.json (reports transitive deps as "missing"). Match the repo's
# lockfile version so `npm ci` stays reproducible.
msg_info "Aligning npm version"
$STD npm install -g npm@11
msg_ok "npm $(npm -v)"

msg_info "Cloning BeyondLedger"
$STD git clone https://github.com/PSeros/BeyondLedger.git "$APP_DIR"
msg_ok "Cloned BeyondLedger"

msg_info "Configuring Environment"
mkdir -p "$DATA_DIR/uploads"
cat <<EOF >"$APP_DIR/.env"
DATABASE_URL=file:$DATA_DIR/beyondledger.db
FILE_STORAGE_DIR=$DATA_DIR/uploads
EOF
msg_ok "Configured Environment"

msg_info "Installing Node Modules (this can take a while)"
cd "$APP_DIR"
$STD npm ci
msg_ok "Installed Node Modules"

msg_info "Applying Database Migrations"
$STD npx prisma generate
$STD npx prisma migrate deploy
msg_ok "Applied Database Migrations"

msg_info "Building Application"
$STD npm run build
msg_ok "Built Application"

msg_info "Creating Service"
cat <<EOF >/etc/systemd/system/beyondledger.service
[Unit]
Description=BeyondLedger
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl enable -q --now beyondledger
msg_ok "Created Service"

motd_ssh
customize
cleanup_lxc
