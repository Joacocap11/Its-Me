from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.conftest import days_ago

Builtin = Callable[[str], dict[str, Any]]
Add = Callable[..., Any]

KEY = "eyeglass_prescription"
RX = {
    "od": {"condition": "both", "sph": -2.25, "cyl": -0.75, "axis": 90, "notes": "Control anual"},
    "oi": {"condition": "myopia", "sph": -1.5},
}


@pytest.fixture
def rx(builtin: Builtin) -> int:
    attribute = builtin(KEY)
    assert attribute["data_type"] == "prescription" and attribute["region"] == "eyes"
    return attribute["id"]


def test_each_eye_keeps_its_own_values(rx: int, add_entry: Add) -> None:
    entry = add_entry(rx, details=RX, notes="Receta del control")
    assert entry["details"] == RX
    assert entry["notes"] == "Receta del control"
    assert entry["value_text"] is None and entry["value_number"] is None


@pytest.mark.parametrize("sph", [-12.5, 0, 0.0, 3.25, 30, -30])
def test_sphere_accepts_negative_zero_and_positive(rx: int, add_entry: Add, sph: float) -> None:
    assert add_entry(rx, details={"od": {"sph": sph}})["details"]["od"]["sph"] == sph


def test_sphere_zero_is_stored_not_dropped(rx: int, add_entry: Add) -> None:
    assert add_entry(rx, details={"od": {"sph": 0}})["details"] == {"od": {"sph": 0}}


@pytest.mark.parametrize("axis", [0, 1, 90, 180])
def test_axis_in_range(rx: int, add_entry: Add, axis: int) -> None:
    assert add_entry(rx, details={"oi": {"cyl": -1, "axis": axis}})["details"]["oi"]["axis"] == axis


@pytest.mark.parametrize("axis", [-1, 181, 90.5, "x"])
def test_axis_out_of_range_rejected(rx: int, add_entry: Add, axis: Any) -> None:
    assert add_entry(rx, expect=422, details={"od": {"cyl": -1, "axis": axis}})["detail"]


@pytest.mark.parametrize(
    "eye",
    [{"sph": 31}, {"sph": -31}, {"cyl": 16}, {"add": -0.5}, {"add": 11}, {"condition": "diabetes"}, {"notes": "x" * 501}, {"left": 1}],
)
def test_invalid_eye_values_rejected(rx: int, add_entry: Add, eye: dict[str, Any]) -> None:
    assert add_entry(rx, expect=422, details={"od": eye})["detail"]


def test_cylinder_axis_and_add_are_optional(rx: int, add_entry: Add) -> None:
    entry = add_entry(rx, details={"od": {"condition": "myopia", "sph": -2}, "oi": {"sph": -1.75, "add": 1.5}})
    assert entry["details"]["od"].keys() == {"condition", "sph"}
    assert entry["details"]["oi"] == {"sph": -1.75, "add": 1.5}


def test_a_single_eye_is_enough_and_the_other_is_not_invented(rx: int, add_entry: Add) -> None:
    assert add_entry(rx, details={"oi": {"sph": -1}, "od": {}})["details"] == {"oi": {"sph": -1}}


@pytest.mark.parametrize("details", [None, {}, {"od": {}}, {"od": {"notes": " "}, "oi": None}])
def test_prescription_requires_some_value(rx: int, add_entry: Add, details: Any) -> None:
    add_entry(rx, expect=422, details=details)


def test_only_od_and_oi_are_accepted(rx: int, add_entry: Add) -> None:
    add_entry(rx, expect=422, details={"right": {"sph": -1}})
    add_entry(rx, expect=422, details={"od": {"sph": -1}, "izquierdo": {"sph": -1}})


def test_prescription_rejects_foreign_values_and_size_details(rx: int, add_entry: Add) -> None:
    add_entry(rx, expect=422, details={"od": {"sph": -1}}, value_text="M")
    add_entry(rx, expect=422, details={"brand": "x"})


def test_size_attribute_rejects_prescription_details(builtin: Builtin, add_entry: Add) -> None:
    add_entry(builtin("tshirt")["id"], expect=422, value_text="M", details={"od": {"sph": -1}})


def test_new_prescription_keeps_previous_one(auth: TestClient, rx: int, builtin: Builtin, add_entry: Add) -> None:
    old = add_entry(rx, details={"od": {"sph": -2}, "oi": {"sph": -1.5}}, measured_on=days_ago(400))
    new = add_entry(rx, details={"od": {"sph": -2.5}, "oi": {"sph": -1.5, "cyl": -0.5, "axis": 10}}, measured_on=days_ago(5))
    history = auth.get(f"/api/attributes/{rx}/entries").json()
    assert [e["id"] for e in history] == [new["id"], old["id"]]
    assert history[1]["details"] == {"od": {"sph": -2}, "oi": {"sph": -1.5}}
    attribute = builtin(KEY)
    assert attribute["latest_entry"]["id"] == new["id"] and attribute["entry_count"] == 2


def test_backdated_prescription_is_not_current(builtin: Builtin, rx: int, add_entry: Add) -> None:
    recent = add_entry(rx, details={"od": {"sph": -2}}, measured_on=days_ago(1))
    add_entry(rx, details={"od": {"sph": -1}}, measured_on=days_ago(900))
    assert builtin(KEY)["latest_entry"]["id"] == recent["id"]


def test_future_prescription_date_rejected(rx: int, add_entry: Add) -> None:
    add_entry(rx, expect=422, details={"od": {"sph": -1}}, measured_on="2999-01-01")


def test_edit_prescription_replaces_both_eyes_and_keeps_dates(auth: TestClient, rx: int, add_entry: Add) -> None:
    entry = add_entry(rx, details=RX, measured_on=days_ago(30))
    response = auth.patch(f"/api/entries/{entry['id']}", json={"details": {"od": {"sph": -2.5}, "oi": {"sph": -2}}})
    body = response.json()
    assert response.status_code == 200
    assert body["details"] == {"od": {"sph": -2.5}, "oi": {"sph": -2}}
    assert body["measured_on"] == entry["measured_on"] and body["created_at"] == entry["created_at"]
    assert auth.patch(f"/api/entries/{entry['id']}", json={"details": {"od": {"axis": 200}}}).status_code == 422
    assert auth.get(f"/api/attributes/{rx}/entries").json()[0]["details"] == body["details"]


def test_edit_notes_and_date_only(auth: TestClient, rx: int, add_entry: Add) -> None:
    entry = add_entry(rx, details=RX)
    body = auth.patch(f"/api/entries/{entry['id']}", json={"notes": "Corregida", "measured_on": days_ago(2)}).json()
    assert body["details"] == RX and body["notes"] == "Corregida" and body["measured_on"] == days_ago(2)


def test_delete_prescription_removes_only_that_one(auth: TestClient, rx: int, add_entry: Add) -> None:
    first = add_entry(rx, details={"od": {"sph": -1}}, measured_on=days_ago(10))
    second = add_entry(rx, details={"od": {"sph": -2}}, measured_on=days_ago(5))
    assert auth.delete(f"/api/entries/{second['id']}").status_code == 204
    assert [e["id"] for e in auth.get(f"/api/attributes/{rx}/entries").json()] == [first["id"]]


def test_prescription_attribute_cannot_be_created_disabled_or_deleted(auth: TestClient, rx: int) -> None:
    body = {"name": "Otra", "data_type": "prescription", "region": "eyes"}
    assert auth.post("/api/attributes", json=body).status_code == 422
    assert auth.patch(f"/api/attributes/{rx}", json={"history_enabled": False}).status_code == 422
    assert auth.delete(f"/api/attributes/{rx}").status_code == 409


def test_prescription_requires_authentication(client: TestClient) -> None:
    assert client.post("/api/entries", json={"attribute_id": 1, "details": RX, "measured_on": days_ago(1)}).status_code == 401


def test_prescription_is_persisted_as_one_row(db_engine: Any, rx: int, add_entry: Add) -> None:
    add_entry(rx, details=RX)
    with db_engine.connect() as conn:
        row = conn.execute(text("SELECT details FROM entries WHERE attribute_id = :a"), {"a": rx}).one()
    assert row.details == RX
