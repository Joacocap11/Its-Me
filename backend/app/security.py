from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

from app import config

COOKIE_NAME = "its_me_session"
_hasher = PasswordHasher()
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except VerificationError:
        return False


def create_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(days=config.SESSION_DAYS)}
    return jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")


def read_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None
