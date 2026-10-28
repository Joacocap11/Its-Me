from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.conftest import days_ago

Builtin = Callable[[str], dict[str, Any]]
Add = Callable[..., Any]


def test_create_measurement_defaults_unit(builtin: Builtin, add_entry: Add) -> None:
    entry = add_entry(builtin("weight")["id"], value_number=72.35, notes="  mañana ")
    assert entry["value_number"] == 72.35 and isinstance(entry["value_number"], float)
    assert entry["unit"] == "kg" and entry["notes"] == "mañana"
    assert entry["value_text"] is None and entry["value_bool"] is None and entry["details"] is None
    assert set(entry) == {
        "id", "attribute_id", "value_number", "value_text", "value_bool", "unit",
        "details", "measured_on", "notes", "created_at", "updated_at",
    }  # fmt: skip


def test_history_is_kept_and_sorted(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    first = add_entry(weight, value_number=70, measured_on=days_ago(10))
    second = add_entry(weight, value_number=71, measured_on=days_ago(5))
    entries = auth.get(f"/api/attributes/{weight}/entries").json()
    assert [e["id"] for e in entries] == [second["id"], first["id"]]
    attribute = builtin("weight")
    assert attribute["entry_count"] == 2 and attribute["latest_entry"]["id"] == second["id"]


def test_latest_is_most_recent_date_even_if_inserted_earlier(builtin: Builtin, add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    recent = add_entry(weight, value_number=80, measured_on=days_ago(1))
    add_entry(weight, value_number=60, measured_on=days_ago(400))
    latest = builtin("weight")["latest_entry"]
    assert latest["id"] == recent["id"] and latest["value_number"] == 80
    assert builtin("weight")["entry_count"] == 2


def test_same_day_tie_breaks_by_id(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    add_entry(weight, value_number=70, measured_on=days_ago(2))
    later = add_entry(weight, value_number=71, measured_on=days_ago(2))
    assert builtin("weight")["latest_entry"]["id"] == later["id"]
    assert auth.get(f"/api/attributes/{weight}/entries").json()[0]["id"] == later["id"]


def test_future_date_rejected(auth: TestClient, builtin: Builtin) -> None:
    from datetime import timedelta

    from tests.conftest import today

    body = {"attribute_id": builtin("weight")["id"], "value_number": 70}
    response = auth.post("/api/entries", json=body | {"measured_on": (today() + timedelta(days=1)).isoformat()})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
    assert auth.post("/api/entries", json=body | {"measured_on": today().isoformat()}).status_code == 201


def test_entry_validation_errors(auth: TestClient, builtin: Builtin) -> None:
    weight = builtin("weight")["id"]
    base = {"attribute_id": weight, "value_number": 70, "measured_on": days_ago(0)}
    for patch in ({"measured_on": "31/12/2020"}, {"measured_on": "nope"}, {"attribute_id": "x"}, {"value_number": "abc"}):
        response = auth.post("/api/entries", json=base | patch)
        assert response.status_code == 422, patch
        assert isinstance(response.json()["detail"], list)
    assert auth.post("/api/entries", json={"attribute_id": weight}).status_code == 422
    assert auth.post("/api/entries", json=base | {"attribute_id": 99999}).status_code == 404


def test_number_ranges(auth: TestClient, builtin: Builtin, make_attribute: Callable[..., dict[str, Any]], add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    for value in (0, -5, 1000.5, 1e6):
        response = add_entry(weight, expect=422, value_number=value)
        assert isinstance(response["detail"], str)
    add_entry(weight, expect=422)
    add_entry(weight, expect=422, value_text="70")
    add_entry(weight, value_number=1000)
    generic = make_attribute(name="Ratio")
    add_entry(generic["id"], value_number=-3.5)
    add_entry(generic["id"], value_number=5e8)
    add_entry(generic["id"], expect=422, value_number=1e9)


def test_text_select_boolean_entries(make_attribute: Callable[..., dict[str, Any]], add_entry: Add) -> None:
    text_attr = make_attribute(name="Notas", data_type="text")
    assert add_entry(text_attr["id"], value_text=" hola ")["value_text"] == "hola"
    add_entry(text_attr["id"], expect=422, value_text="  ")
    add_entry(text_attr["id"], expect=422, value_number=3)

    select = make_attribute(name="Ojos", data_type="select", options=["Azul", "Verde"])
    assert add_entry(select["id"], value_text="Azul")["value_text"] == "Azul"
    add_entry(select["id"], expect=422, value_text="Rojo")

    flag = make_attribute(name="Lentes", data_type="boolean")
    assert add_entry(flag["id"], value_bool=False)["value_bool"] is False
    assert add_entry(flag["id"], value_bool=True)["value_bool"] is True
    add_entry(flag["id"], expect=422)
    add_entry(flag["id"], expect=422, value_text="si")


def test_patch_entry(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    entry = add_entry(builtin("weight")["id"], value_number=70, notes="a", measured_on=days_ago(3))
    response = auth.patch(f"/api/entries/{entry['id']}", json={"value_number": 71.5})
    body = response.json()
    assert response.status_code == 200
    assert body["value_number"] == 71.5 and body["notes"] == "a" and body["measured_on"] == days_ago(3)
    assert body["updated_at"] >= entry["updated_at"] and body["created_at"] == entry["created_at"]
    body = auth.patch(f"/api/entries/{entry['id']}", json={"notes": None, "measured_on": days_ago(8)}).json()
    assert body["notes"] is None and body["measured_on"] == days_ago(8)
    assert auth.patch(f"/api/entries/{entry['id']}", json={"value_number": 0}).status_code == 422
    assert auth.patch(f"/api/entries/{entry['id']}", json={"measured_on": "2999-01-01"}).status_code == 422
    assert auth.patch("/api/entries/99999", json={"notes": "x"}).status_code == 404


def test_patch_changes_latest(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    add_entry(weight, value_number=70, measured_on=days_ago(1))
    old = add_entry(weight, value_number=65, measured_on=days_ago(30))
    auth.patch(f"/api/entries/{old['id']}", json={"measured_on": days_ago(0)})
    assert builtin("weight")["latest_entry"]["id"] == old["id"]


def test_delete_entry(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    keep = add_entry(weight, value_number=70, measured_on=days_ago(5))
    gone = add_entry(weight, value_number=71)
    assert auth.delete(f"/api/entries/{gone['id']}").status_code == 204
    assert auth.delete(f"/api/entries/{gone['id']}").status_code == 404
    attribute = builtin("weight")
    assert attribute["entry_count"] == 1 and attribute["latest_entry"]["id"] == keep["id"]


def test_history_disabled_replaces_previous(auth: TestClient, builtin: Builtin, add_entry: Add, db_engine) -> None:
    weight = builtin("weight")["id"]
    auth.patch(f"/api/attributes/{weight}", json={"history_enabled": False})
    add_entry(weight, value_number=70, measured_on=days_ago(10))
    newest = add_entry(weight, value_number=71)
    entries = auth.get(f"/api/attributes/{weight}/entries").json()
    assert [e["id"] for e in entries] == [newest["id"]]
    with db_engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM entries")).scalar_one() == 1


def test_history_disabled_isolated_to_attribute(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    height = builtin("height")["id"]
    add_entry(height, value_number=170)
    auth.patch(f"/api/attributes/{builtin('weight')['id']}", json={"history_enabled": False})
    add_entry(builtin("weight")["id"], value_number=70)
    assert builtin("height")["entry_count"] == 1


def test_invalid_replacement_keeps_previous(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    weight = builtin("weight")["id"]
    auth.patch(f"/api/attributes/{weight}", json={"history_enabled": False})
    add_entry(weight, value_number=70)
    add_entry(weight, expect=422, value_number=-1)
    assert builtin("weight")["entry_count"] == 1
