import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import config
from app.db import get_db
from app.deps import optional_user
from app.models import User
from app.schemas import AuthStatus, Credentials, SetupRequest, UserOut
from app.security import COOKIE_NAME, create_token, hash_password, verify_password

router = APIRouter(prefix="/auth")

MAX_FAILURES = 10
WINDOW_SECONDS = 300


class LoginLimiter:
    def __init__(self) -> None:
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, client: str) -> deque[float]:
        failures = self._failures[client]
        while failures and time.monotonic() - failures[0] > WINDOW_SECONDS:
            failures.popleft()
        if not failures:
            del self._failures[client]
        return failures

    def blocked(self, client: str) -> bool:
        return len(self._recent(client)) >= MAX_FAILURES

    def fail(self, client: str) -> None:
        self._recent(client)
        self._failures[client].append(time.monotonic())

    def clear(self, client: str) -> None:
        self._failures.pop(client, None)


limiter = LoginLimiter()


def _client(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _start_session(response: Response, user: User) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_token(user.id),
        max_age=config.SESSION_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=config.COOKIE_SECURE,
        path="/",
    )


@router.get("/status")
def auth_status(db: Session = Depends(get_db), user: User | None = Depends(optional_user)) -> AuthStatus:
    configured = db.scalar(select(User.id).limit(1)) is not None
    return AuthStatus(configured=configured, authenticated=user is not None, username=user.username if user else None)


@router.post("/setup", status_code=201)
def setup(body: SetupRequest, response: Response, db: Session = Depends(get_db)) -> UserOut:
    if db.scalar(select(User.id).limit(1)) is not None:
        raise HTTPException(409, "Ya existe un usuario configurado")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        raise HTTPException(409, "Ya existe un usuario configurado")
    _start_session(response, user)
    return UserOut(username=user.username)


@router.post("/login")
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_db)) -> UserOut:
    client = _client(request)
    if limiter.blocked(client):
        raise HTTPException(429, "Demasiados intentos fallidos. Probá de nuevo en unos minutos")
    user = db.scalar(select(User).where(User.username == body.username))
    if not verify_password(user.password_hash if user else None, body.password):
        limiter.fail(client)
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    limiter.clear(client)
    _start_session(response, user)
    return UserOut(username=user.username)


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, samesite="lax", secure=config.COOKIE_SECURE)
