from fastapi import APIRouter, Depends, FastAPI

from app.deps import require_user
from app.routers import attributes, auth, entries, health

app = FastAPI(title="It's Me", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

api = APIRouter(prefix="/api")
api.include_router(health.router)
api.include_router(auth.router)
api.include_router(attributes.router, dependencies=[Depends(require_user)])
api.include_router(entries.router, dependencies=[Depends(require_user)])
app.include_router(api)
