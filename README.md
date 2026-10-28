# It's Me

Aplicación web self-hosted, de un solo usuario, para registrar y consultar medidas corporales, talles de ropa y calzado, y atributos físicos personalizados, con historial completo.

## Objetivo

Tener en un solo lugar, accesible desde el celular, los datos corporales y talles habituales, sin depender de servicios externos y sin perder el historial cuando cambia un valor.

## Funcionalidades

- Autenticación de un solo usuario: configuración inicial, login, logout, rutas protegidas, contraseñas con Argon2. Sin registro público tras crear el usuario inicial.
- Dashboard con silueta humana SVG interactiva (frente y espalda), regiones seleccionables, panel de atributos, navegación por categorías y búsqueda.
- Medidas corporales (peso, altura, contornos, anchos, largos, etc.) con unidad.
- Talles: alfabéticos, numéricos, EU/US/UK, pantalón W/L, marca, modelo, calce y observaciones. Una categoría puede tener un talle vigente por cada sistema (y marca/modelo) a la vez, con desplegable "Ver todos mis talles" e historial por sistema. No se asumen equivalencias entre marcas ni sistemas.
- Historial: valor vigente, valores anteriores, carga con fecha pasada, corrección, eliminación con confirmación y gráfico de evolución. Agregar un valor nunca sobrescribe el historial (salvo en atributos con historial deshabilitado).
- Atributos personalizados (número, texto, selección, booleano, talle) sin migraciones: el modelo es EAV.
- Graduación de anteojos (región "Ojos"): receta con OD y OI independientes (condición, SPH, CYL, AXIS, ADD, observaciones), historial de recetas y ayuda sobre las abreviaturas. Solo registra lo que figura en la receta; no interpreta ni diagnostica.
- "Mis talles": consulta rápida pensada para celular.
- Modo claro/oscuro, mobile-first, fechas DD/MM/YYYY.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, SVG |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker, Docker Compose, Nginx |

## Requisitos

Docker y Docker Compose v2. No hace falta instalar nada más.

## Ejecución con Docker Compose

```sh
cp .env.example .env
# editar .env: definir POSTGRES_PASSWORD y SECRET_KEY (openssl rand -hex 32)
docker compose up -d --build
```

La aplicación queda en `http://localhost:${ITS_ME_PORT}` (3004 por defecto). En el primer acceso se pide crear el usuario administrador.

Para exponer además la API y PostgreSQL solo en `127.0.0.1` durante el desarrollo:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
```

Frontend con recarga en caliente: `cd frontend && npm install && npm run dev` (proxy de `/api` a `localhost:8000`, el backend publicado por `compose.dev.yaml`).

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `ITS_ME_PORT` | Puerto externo del servicio web | `3004` |
| `POSTGRES_DB` / `POSTGRES_USER` | Base y usuario de PostgreSQL | `its_me` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL (obligatoria) | `change-me` |
| `SECRET_KEY` | Clave de firma de sesiones, mínimo 32 caracteres (obligatoria) | `change-me-...` |
| `COOKIE_SECURE` | `true` si se sirve por HTTPS | `false` |
| `SESSION_DAYS` | Duración de la sesión | `30` |

Ver `.env.example`. El archivo `.env` real está ignorado por Git.

## Migraciones

Alembic se ejecuta automáticamente al iniciar el backend (`alembic upgrade head`). La migración inicial crea el esquema y carga las *definiciones* de atributos predefinidos (sin valores). Para generar una nueva:

```sh
docker compose run --rm its-me-backend alembic revision -m "descripcion"
```

## Pruebas

```sh
docker compose -f compose.test.yaml run --rm --build its-me-backend-tests   # backend, contra PostgreSQL real
docker compose -f compose.test.yaml down -v
cd frontend && npm install && npm run typecheck && npm test && npm run build
```

## Estructura

```
backend/    API FastAPI, modelos, migraciones Alembic y pruebas
frontend/   SPA React + Nginx
docs/       Decisiones técnicas y despliegue
compose.yaml       Stack base (db, backend, web)
compose.dev.yaml   Override de desarrollo
compose.test.yaml  Pruebas del backend con PostgreSQL efímero
```

## Despliegue

Ver [docs/deployment.md](docs/deployment.md). En resumen: clonar el repositorio en el host, crear `.env` con secretos propios generados en ese host y ejecutar `docker compose up -d --build`. Solo el servicio web publica un puerto; la base de datos y el backend viven en la red interna `its-me-internal`.

## Seguridad

- Secretos únicamente en `.env` (ignorado por Git); nunca versionar credenciales, dumps ni backups.
- Contraseñas con Argon2, sesión en cookie HttpOnly SameSite=Lax, limitación de intentos de login.
- Nginx envía cabeceras de seguridad y CSP.
- La aplicación no tiene TLS propio: para acceso fuera de la red local, usar un proxy inverso con HTTPS y `COOKIE_SECURE=true`.
- Decisiones de diseño en [docs/architecture.md](docs/architecture.md).

## Licencia

MIT. Ver [LICENSE](LICENSE).
