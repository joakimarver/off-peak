#!/usr/bin/env bash
# Off-Peak Proxmox LXC Installer
# Installs Off-Peak inside a Debian/Ubuntu LXC container (or any Debian/Ubuntu host)
# Usage: bash install.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

APP_DIR="/opt/off-peak"
DATA_DIR="/opt/off-peak/secrets"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/docker.env"

header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  ⚡  Off-Peak Installer${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

log_info()    { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_step()    { echo -e "\n${BLUE}▶ $1${NC}"; }

check_root() {
  if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (or with sudo)."
    exit 1
  fi
}

install_docker() {
  log_step "Installing Docker & Docker Compose"
  if command -v docker &>/dev/null; then
    log_info "Docker is already installed: $(docker --version)"
    return
  fi

  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

  systemctl enable --now docker
  log_info "Docker installed: $(docker --version)"
}

create_app_dir() {
  log_step "Creating application directory at $APP_DIR"
  mkdir -p "$APP_DIR" "$DATA_DIR"
  log_info "Directories created."
}

write_compose_file() {
  log_step "Writing docker-compose.yml"
  cat > "$COMPOSE_FILE" <<'COMPOSE'
version: '3.8'

services:
  offpeak:
    image: ghcr.io/joakimarver/off-peak:latest
    restart: unless-stopped
    volumes:
      - ./secrets:/secrets:ro
    ports:
      - "3000:8080"
    env_file:
      - ./docker.env
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:8080/healthz || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
COMPOSE
  log_info "docker-compose.yml written."
}

collect_credentials() {
  log_step "Configuring Off-Peak credentials"
  echo -e "${YELLOW}You need Tibber OAuth credentials to enable login."
  echo -e "Register a developer app at https://developer.tibber.com${NC}\n"

  read -rp "  Tibber OAuth Client ID     : " OAUTH_CLIENT_ID
  read -rp "  Tibber OAuth Client Secret : " OAUTH_CLIENT_SECRET

  # Detect host IP for default callback suggestion
  local host_ip
  host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_HOST_IP")
  local default_callback="https://off-peak.basement.se/auth/callback"

  echo ""
  echo -e "  Default callback URL: ${CYAN}${default_callback}${NC}"
  read -rp "  OAuth Callback URL [${default_callback}]: " OAUTH_CALLBACK
  OAUTH_CALLBACK="${OAUTH_CALLBACK:-$default_callback}"

  echo ""
  log_warn "Firebase is optional. Leave blank to run without snapshot support."
  read -rp "  Firebase Project ID  (optional): " FIREBASE_PROJECT
  read -rp "  Firebase Database    (optional): " FIREBASE_DB
  read -rp "  Firebase Key path    (optional, relative to $DATA_DIR): " FIREBASE_KEY_REL

  FIREBASE_KEY=""
  if [[ -n "$FIREBASE_KEY_REL" ]]; then
    FIREBASE_KEY="/secrets/$FIREBASE_KEY_REL"
  fi

  cat > "$ENV_FILE" <<ENV
OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
OAUTH_CALLBACK=${OAUTH_CALLBACK}
FIREBASE_PROJECT=${FIREBASE_PROJECT}
FIREBASE_KEY=${FIREBASE_KEY}
FIREBASE_DB=${FIREBASE_DB}
ENV

  chmod 600 "$ENV_FILE"
  log_info "Credentials saved to $ENV_FILE (permissions: 600)"
}

pull_and_start() {
  log_step "Pulling image and starting Off-Peak"
  cd "$APP_DIR"
  docker compose pull
  docker compose up -d
  log_info "Off-Peak is starting up…"
}

print_summary() {
  local host_ip
  host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_HOST_IP")

  echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✅  Installation complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e ""
  echo -e "  ${CYAN}Local URL :${NC} http://${host_ip}:3000"
  echo -e "  ${CYAN}Public URL:${NC} https://off-peak.basement.se  (configure your reverse proxy)"
  echo -e ""
  echo -e "  App directory : $APP_DIR"
  echo -e "  Credentials   : $ENV_FILE"
  echo -e "  Secrets dir   : $DATA_DIR"
  echo -e ""
  echo -e "  Useful commands:"
  echo -e "    cd $APP_DIR && docker compose logs -f    # view logs"
  echo -e "    cd $APP_DIR && docker compose restart    # restart"
  echo -e "    cd $APP_DIR && docker compose pull && docker compose up -d  # update"
  echo -e ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
header
check_root
install_docker
create_app_dir
write_compose_file
collect_credentials
pull_and_start
print_summary
