import os
from collections.abc import Callable, Iterator
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    pytest.exit("TEST_DATABASE_URL no está definida", returncode=2)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-at-least-32-characters")

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from app.main import app  # noqa: E402
from app.routers.auth import limiter  # noqa: E402

PASSWORD = "correct horse battery"


def today() -> date:
    return datetime.now(UTC).date()


def days_ago(days: int) -> str:
    return (today() - timedelta(days=days)).isoformat()


@pytest.fixture(scope="session", autouse=True)
def schema() -> None:
    engine = create_engine(TEST_DATABASE_URL)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    engine.dispose()
    command.upgrade(Config(str(Path(__file__).parent.parent / "alembic.ini")), "head")


@pytest.fixture(autouse=True)
def clean_state() -> None:
    engine = create_engine(TEST_DATABASE_URL)
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE entries, users RESTART IDENTITY"))
        conn.execute(text("DELETE FROM attributes WHERE NOT builtin"))
        conn.execute(text("UPDATE attributes SET history_enabled = true"))
    engine.dispose()
    limiter._failures.clear()


@pytest.fixture
def db_engine() -> Iterator[Any]:
    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client: TestClient) -> TestClient:
    response = client.post("/api/auth/setup", json={"username": "tester", "password": PASSWORD})
    assert response.status_code == 201
    return client


@pytest.fixture
def builtin(auth: TestClient) -> Callable[[str], dict[str, Any]]:
    def find(key: str) -> dict[str, Any]:
        return next(a for a in auth.get("/api/attributes").json() if a["key"] == key)

    return find


@pytest.fixture
def make_attribute(auth: TestClient) -> Callable[..., dict[str, Any]]:
    def create(**fields: Any) -> dict[str, Any]:
        body = {"name": "Custom", "data_type": "number", "region": "full_body"} | fields
        response = auth.post("/api/attributes", json=body)
        assert response.status_code == 201, response.text
        return response.json()

    return create


@pytest.fixture
def add_entry(auth: TestClient) -> Callable[..., Any]:
    def create(attribute_id: int, expect: int = 201, **fields: Any) -> Any:
        body = {"attribute_id": attribute_id, "measured_on": days_ago(0)} | fields
        response = auth.post("/api/entries", json=body)
        assert response.status_code == expect, response.text
        return response.json()

    return create
