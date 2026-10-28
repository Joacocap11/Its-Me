#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
DIR="${BACKUP_DIR:-/srv/backups/its-me}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

umask 077
mkdir -p "$DIR"
chmod 700 "$DIR"
FILE="$DIR/its-me-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T its-me-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' | gzip > "$FILE.tmp"
gzip -t "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'its-me-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$FILE"
