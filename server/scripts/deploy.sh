#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/home/achipiga/Development/smart-park"
STACK_DIR="$PROJECT_ROOT/server"
COMPOSE_FILE="$STACK_DIR/docker-compose.prod.yml"
PROJECT_NAME="smart-park-prod"

usage() {
  echo "Usage: $0 {up|down}"
  exit 1
}

COMMAND="${1:-}"
if [[ "$COMMAND" != "up" && "$COMMAND" != "down" ]]; then
  usage
fi

export TRAEFIK_DOMAIN="${TRAEFIK_DOMAIN:-smartparkistu.ru}"
export TRAEFIK_ACME_EMAIL="${TRAEFIK_ACME_EMAIL:-yxaz16@yandex.ru}"

if [[ "$COMMAND" == "up" ]]; then
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d
else
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down
fi

