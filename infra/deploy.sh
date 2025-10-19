#!/usr/bin/env bash
set -euo pipefail

# Simple "one-click" deployment helper for the Travel Planner stack.
# It prepares a clean directory, pulls environment templates, generates a
# docker-compose file that relies on pre-built images, and launches the stack.

REPO_RAW_BASE="https://raw.githubusercontent.com/G1nkgo7/lm4se_assignment_web_AI_Travel_Planner/main"
DEPLOY_DIR="${DEPLOY_DIR:-travel-planner-deploy}"
FORCE=0
SKIP_UP=0
DEFAULT_FRONTEND_PORT=3000
DEFAULT_BACKEND_PORT=8080

usage() {
  cat <<'EOF'
Usage: deploy.sh [options]

Options:
  -d, --dir <path>      Target directory for the deployment bundle (default: travel-planner-deploy)
  --frontend <image>    Pre-built frontend image reference
  --backend <image>     Pre-built backend image reference
  -f, --force           Overwrite existing generated files (docker-compose.yml, *.env)
  --skip-up             Generate assets but do not run docker compose up -d
  -h, --help            Show this help message and exit

Environment overrides:
  DEPLOY_DIR            Same as --dir
  FRONTEND_IMAGE        Same as --frontend
  BACKEND_IMAGE         Same as --backend
EOF
}

log() { printf '[deploy] %s\n' "$*"; }
err() { printf '[deploy][error] %s\n' "$*" >&2; }

FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"
BACKEND_IMAGE="${BACKEND_IMAGE:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)
      [[ $# -lt 2 ]] && { err "Missing value for $1"; exit 1; }
      DEPLOY_DIR="$2"
      shift 2
      ;;
    --frontend)
      [[ $# -lt 2 ]] && { err "Missing value for $1"; exit 1; }
      FRONTEND_IMAGE="$2"
      shift 2
      ;;
    --backend)
      [[ $# -lt 2 ]] && { err "Missing value for $1"; exit 1; }
      BACKEND_IMAGE="$2"
      shift 2
      ;;
    -f|--force)
      FORCE=1
      shift
      ;;
    --skip-up)
      SKIP_UP=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      err "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  err "curl is required"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  err "docker is required"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_BIN=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_BIN=(docker-compose)
else
  err "docker compose plugin or docker-compose binary is required"
  exit 1
fi

if [[ -z "$FRONTEND_IMAGE" ]]; then
  read -r -p "Enter frontend image (e.g., ghcr.io/owner/frontend:tag): " FRONTEND_IMAGE
fi
if [[ -z "$BACKEND_IMAGE" ]]; then
  read -r -p "Enter backend image (e.g., ghcr.io/owner/backend:tag): " BACKEND_IMAGE
fi

[[ -z "$FRONTEND_IMAGE" ]] && { err "Frontend image is required"; exit 1; }
[[ -z "$BACKEND_IMAGE" ]] && { err "Backend image is required"; exit 1; }

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

fetch_file() {
  local url="$1"
  local dest="$2"
  local label="$3"
  if [[ -f "$dest" && $FORCE -eq 0 ]]; then
    log "$label already exists, skipping"
    return 0
  fi
  log "Fetching $label"
  curl -fsSL "$url" -o "$dest"
}

fetch_file "$REPO_RAW_BASE/frontend/.env" "frontend.env" "frontend.env"
fetch_file "$REPO_RAW_BASE/backend/.env" "backend.env" "backend.env"

if [[ $FORCE -eq 1 || ! -f docker-compose.yml ]]; then
  log "Generating docker-compose.yml"
  cat > docker-compose.yml <<EOF
version: "3.9"

services:
  backend:
    image: ${BACKEND_IMAGE}
    container_name: travel_planner_backend
    env_file:
      - backend.env
    ports:
      - "\${BACKEND_PORT:-${DEFAULT_BACKEND_PORT}}:8080"
    restart: unless-stopped

  frontend:
    image: ${FRONTEND_IMAGE}
    container_name: travel_planner_frontend
    env_file:
      - frontend.env
    ports:
      - "\${FRONTEND_PORT:-${DEFAULT_FRONTEND_PORT}}:3000"
    depends_on:
      - backend
    restart: unless-stopped
EOF
else
  log "docker-compose.yml exists, skipping (use --force to overwrite)"
fi

if [[ ! -f compose.env || $FORCE -eq 1 ]]; then
  log "Writing compose.env"
  cat > compose.env <<'EOF'
# Override exposed host ports if needed
FRONTEND_PORT=3000
BACKEND_PORT=8080
EOF
else
  log "compose.env exists, skipping (use --force to overwrite)"
fi

if grep -q "API_PROXY_TARGET=http://localhost:8080" frontend.env; then
  log "Adjusting API_PROXY_TARGET to backend service hostname"
  sed -i 's#API_PROXY_TARGET=http://localhost:8080#API_PROXY_TARGET=http://backend:8080#' frontend.env
fi

if [[ $SKIP_UP -eq 1 ]]; then
  log "Skipping docker compose up as requested"
  exit 0
fi

log "Launching stack"
"${COMPOSE_BIN[@]}" --env-file compose.env up -d

HOST_FRONTEND_PORT=$(grep -E '^FRONTEND_PORT=' compose.env | tail -n1 | cut -d'=' -f2)
HOST_BACKEND_PORT=$(grep -E '^BACKEND_PORT=' compose.env | tail -n1 | cut -d'=' -f2)
[[ -z "$HOST_FRONTEND_PORT" ]] && HOST_FRONTEND_PORT=$DEFAULT_FRONTEND_PORT
[[ -z "$HOST_BACKEND_PORT" ]] && HOST_BACKEND_PORT=$DEFAULT_BACKEND_PORT

log "Done. Frontend: http://localhost:${HOST_FRONTEND_PORT}  Backend: http://localhost:${HOST_BACKEND_PORT}"
