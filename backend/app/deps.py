from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.security import COOKIE_NAME, read_token


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(COOKIE_NAME)
    user_id = read_token(token) if token else None
    return db.get(User, user_id) if user_id else None


def require_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise HTTPException(401, "No autenticado")
    return user
