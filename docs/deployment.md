# Despliegue en un host Docker (p. ej. LXC en Proxmox)

Requisitos del host: Docker Engine, Docker Compose v2, git, `openssl` y un puerto libre (por defecto 3004).

Todos los comandos se ejecutan dentro del directorio de instalación. El proyecto Compose se llama `its-me` (definido en `compose.yaml`), así que ningún comando afecta a otros proyectos del host.

## Instalación

```sh
git clone --branch main https://github.com/Joacocap11/Its-Me.git /srv/apps/Its-Me
cd /srv/apps/Its-Me
cp .env.example .env && chmod 600 .env
```

Editar `.env` y reemplazar los valores de ejemplo por secretos generados en el host, sin dejarlos en el historial del shell:

```sh
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|; s|^SECRET_KEY=.*|SECRET_KEY=$(openssl rand -hex 32)|" .env
docker compose up -d --build --wait
```

`COOKIE_SECURE=false` es necesario solo mientras se acceda por HTTP en la red local; con HTTPS (proxy inverso) debe ser `true`.

Abrir `http://<ip-del-host>:<ITS_ME_PORT>` y crear el usuario inicial. No abrir el puerto en el router ni publicarlo en Internet: HTTP no cifra credenciales ni sesiones.

Recursos propios: contenedores `its-me-db`, `its-me-backend`, `its-me-web`, red `its-me-internal`, volumen `its-me-pgdata`. Solo `its-me-web` publica un puerto; PostgreSQL y el backend no.

## Operación

| Acción | Comando |
|---|---|
| Estado | `docker compose ps` |
| Logs | `docker compose logs -f --tail 100 its-me-backend` |
| Detener solo It's Me | `docker compose stop` |
| Iniciar | `docker compose up -d` |
| Reiniciar | `docker compose restart` |

Nunca usar `docker compose down -v` (borra el volumen con los datos) ni comandos `prune`.

## Actualización

```sh
./scripts/update.sh
```

Hace `git pull --ff-only`, un respaldo, `docker compose up -d --build --wait` (las migraciones Alembic corren al iniciar el backend) y muestra el estado. Si el pull falla por cambios locales, resolverlos antes de continuar.

## Respaldos

```sh
./scripts/backup.sh
```

Genera `its-me-<fecha>.sql.gz` en `/srv/backups/its-me` (fuera del repositorio, directorio `700`, archivos `600`) y elimina los de más de `BACKUP_KEEP_DAYS` días (14 por defecto). Variables opcionales: `BACKUP_DIR`, `BACKUP_KEEP_DAYS`. El script no contiene credenciales: `pg_dump` se ejecuta dentro del contenedor de la base.

Programación opcional (cron del host, por ejemplo diaria a las 03:30):

```
30 3 * * * cd /srv/apps/Its-Me && ./scripts/backup.sh >> /srv/backups/its-me/backup.log 2>&1
```

Verificar que no choque con otras tareas de respaldo del host antes de instalarla.

## Restauración

```sh
./scripts/restore.sh /srv/backups/its-me/its-me-<fecha>.sql.gz
```

Pide confirmación, detiene `its-me-web` y `its-me-backend`, restaura el volcado sobre la base (el respaldo incluye `--clean --if-exists`) y vuelve a iniciarlos. Hacer un respaldo previo si hay datos que conservar. Conviene copiar los respaldos periódicamente a otro equipo.
