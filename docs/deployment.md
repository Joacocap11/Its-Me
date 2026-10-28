# Despliegue en un host Docker (p. ej. LXC en Proxmox)

Requisitos del host: Docker Engine, Docker Compose v2, puerto libre (por defecto 3004).

1. Clonar: `git clone https://github.com/Joacocap11/Its-Me.git && cd Its-Me`
2. `cp .env.example .env` y definir valores propios:
   - `POSTGRES_PASSWORD=$(openssl rand -hex 16)`
   - `SECRET_KEY=$(openssl rand -hex 32)`
   - `ITS_ME_PORT` si 3004 no está libre.
3. `docker compose up -d --build`
4. Verificar: `docker compose ps` (los tres servicios `healthy`) y abrir `http://<ip-del-host>:<ITS_ME_PORT>`; crear el usuario inicial.

Recursos propios (no interfieren con otras apps): contenedores `its-me-*`, red `its-me-internal`, volumen `its-me-pgdata`. PostgreSQL no publica puertos.

## Actualización

`git pull && docker compose up -d --build` (las migraciones corren al iniciar el backend).

## Backup

```sh
docker compose exec its-me-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > ../its-me-backup.sql
```

Guardar los backups fuera del repositorio.
