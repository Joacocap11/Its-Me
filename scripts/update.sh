#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

git pull --ff-only
./scripts/backup.sh
docker compose up -d --build --wait
docker compose ps
