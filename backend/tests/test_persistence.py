from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.main import app
from tests.conftest import PASSWORD, TEST_DATABASE_URL, days_ago


def test_data_survives_new_engine_and_session(
    builtin: Callable[[str], dict[str, Any]], add_entry: Callable[..., Any], make_attribute: Callable[..., dict[str, Any]]
) -> None:
    weight = builtin("weight")["id"]
    entry = add_entry(weight, value_number=72.5, measured_on=days_ago(2), notes="persistente")
    custom = make_attribute(name="Persistente", data_type="select", options=["a", "b"], unit=None)
    size = add_entry(builtin("pants")["id"], unit="WL", details={"brand": "B", "waist": 32, "length": 30})

    engine = create_engine(TEST_DATABASE_URL)
    with engine.connect() as conn:
        row = conn.execute(text("SELECT value_number, unit, notes, measured_on FROM entries WHERE id = :id"), {"id": entry["id"]}).one()
        assert (float(row.value_number), row.unit, row.notes, row.measured_on.isoformat()) == (72.5, "kg", "persistente", days_ago(2))
        details = conn.execute(text("SELECT value_text, details FROM entries WHERE id = :id"), {"id": size["id"]}).one()
        assert details.value_text == "W32/L30" and details.details == {"brand": "B", "waist": 32, "length": 30}
        stored = conn.execute(text("SELECT options, builtin FROM attributes WHERE id = :id"), {"id": custom["id"]}).one()
        assert stored.options == ["a", "b"] and stored.builtin is False
        assert conn.execute(text("SELECT count(*) FROM attributes WHERE builtin")).scalar_one() == 20
    engine.dispose()

    with TestClient(app) as fresh:
        assert fresh.get("/api/attributes").status_code == 401
        assert fresh.post("/api/auth/login", json={"username": "tester", "password": PASSWORD}).status_code == 200
        entries = fresh.get(f"/api/attributes/{weight}/entries").json()
        assert [e["id"] for e in entries] == [entry["id"]] and entries[0]["value_number"] == 72.5
        assert any(a["id"] == custom["id"] for a in fresh.get("/api/attributes").json())


def test_deletion_is_persisted(auth: TestClient, builtin: Callable[[str], dict[str, Any]], add_entry: Callable[..., Any], db_engine) -> None:
    entry = add_entry(builtin("weight")["id"], value_number=70)
    auth.delete(f"/api/entries/{entry['id']}")
    with db_engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM entries")).scalar_one() == 0
