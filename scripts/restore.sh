#!/bin/sh
set -eu
[ $# -eq 1 ] && [ -f "$1" ] || { echo "Uso: $0 <respaldo.sql.gz>" >&2; exit 1; }
cd "$(dirname "$0")/.."
printf 'Esto reemplaza los datos actuales de It'"'"'s Me con %s. Escribí RESTAURAR para continuar: ' "$1"
read -r answer
[ "$answer" = "RESTAURAR" ] || { echo "Cancelado"; exit 1; }

docker compose stop its-me-web its-me-backend
gunzip -c "$1" | docker compose exec -T its-me-db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose start its-me-backend its-me-web
