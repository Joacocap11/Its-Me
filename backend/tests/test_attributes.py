from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import text

Factory = Callable[..., dict[str, Any]]


def test_builtin_attributes_seeded(auth: TestClient) -> None:
    attributes = auth.get("/api/attributes").json()
    assert len(attributes) == 21
    assert all(a["builtin"] and a["latest_entry"] is None and a["entry_count"] == 0 for a in attributes)
    by_key = {a["key"]: a for a in attributes}
    assert by_key["weight"]["unit"] == "kg" and by_key["weight"]["data_type"] == "number"
    assert by_key["pants"]["size_kind"] == "pants" and by_key["pants"]["data_type"] == "size"
    assert by_key["shoes"]["region"] == "feet" and by_key["cap"]["size_kind"] == "hat"
    assert by_key["gloves"]["size_kind"] == "glove" and by_key["gloves"]["region"] == "hands"
    assert set(by_key["weight"]) == {
        "id", "key", "name", "data_type", "region", "unit", "options", "size_kind",
        "history_enabled", "builtin", "sort_order", "created_at", "latest_entry", "current_entries", "entry_count",
    }  # fmt: skip


def test_create_custom_number(make_attribute: Factory) -> None:
    attr = make_attribute(name="Ancho de muñeca", unit="cm", region="arms")
    assert attr["key"] == "ancho_de_muneca"
    assert attr["builtin"] is False and attr["history_enabled"] is True
    assert attr["unit"] == "cm" and attr["region"] == "arms" and attr["options"] is None and attr["size_kind"] is None


def test_slug_uniqueness(make_attribute: Factory) -> None:
    keys = [make_attribute(name="Café Favorito")["key"] for _ in range(3)]
    assert keys == ["cafe_favorito", "cafe_favorito_2", "cafe_favorito_3"]
    assert make_attribute(name="Peso")["key"] == "peso"


def test_slug_does_not_collide_with_builtin(make_attribute: Factory) -> None:
    assert make_attribute(name="weight")["key"] == "weight_2"


def test_create_select(make_attribute: Factory, auth: TestClient) -> None:
    attr = make_attribute(name="Color de ojos", data_type="select", region="eyes", options=[" Azul ", "Verde"])
    assert attr["options"] == ["Azul", "Verde"]
    for options in (None, ["Solo una"], ["A", "A"], ["A", " "]):
        body = {"name": "X", "data_type": "select", "region": "eyes", "options": options}
        response = auth.post("/api/attributes", json=body)
        assert response.status_code == 422, options
        assert isinstance(response.json()["detail"], list)


def test_create_boolean_and_text(make_attribute: Factory) -> None:
    assert make_attribute(name="Usa lentes", data_type="boolean", region="eyes")["data_type"] == "boolean"
    assert make_attribute(name="Alergias", data_type="text", region="full_body")["data_type"] == "text"


def test_create_size_defaults_and_kind(make_attribute: Factory, auth: TestClient) -> None:
    assert make_attribute(name="Medias", data_type="size", region="feet")["size_kind"] == "alpha"
    assert make_attribute(name="Anillos", data_type="size", region="hands", size_kind="numeric")["size_kind"] == "numeric"
    response = auth.post("/api/attributes", json={"name": "X", "data_type": "size", "region": "feet", "size_kind": "bogus"})
    assert response.status_code == 422


def test_create_validation_errors(auth: TestClient) -> None:
    base = {"name": "X", "data_type": "number", "region": "head"}
    for patch in ({"name": ""}, {"name": "   "}, {"region": "knees"}, {"data_type": "color"}, {"name": "a" * 81}):
        response = auth.post("/api/attributes", json=base | patch)
        assert response.status_code == 422, patch
        assert isinstance(response.json()["detail"], list)
    assert auth.post("/api/attributes", json={"name": "X"}).status_code == 422


def test_create_rejects_irrelevant_unit_or_options(auth: TestClient) -> None:
    response = auth.post("/api/attributes", json={"name": "X", "data_type": "boolean", "region": "head", "unit": "cm"})
    assert response.status_code == 422 and isinstance(response.json()["detail"], str)
    response = auth.post("/api/attributes", json={"name": "X", "data_type": "number", "region": "head", "options": ["a", "b"]})
    assert response.status_code == 422


def test_builtin_cannot_be_deleted(auth: TestClient, builtin: Callable[[str], dict[str, Any]]) -> None:
    response = auth.delete(f"/api/attributes/{builtin('weight')['id']}")
    assert response.status_code == 409
    assert isinstance(response.json()["detail"], str)
    assert any(a["key"] == "weight" for a in auth.get("/api/attributes").json())


def test_builtin_patch_only_history(auth: TestClient, builtin: Callable[[str], dict[str, Any]]) -> None:
    weight = builtin("weight")
    assert auth.patch(f"/api/attributes/{weight['id']}", json={"name": "Otro"}).status_code == 400
    response = auth.patch(f"/api/attributes/{weight['id']}", json={"history_enabled": False})
    assert response.status_code == 200 and response.json()["history_enabled"] is False


def test_patch_custom(make_attribute: Factory, auth: TestClient) -> None:
    attr = make_attribute(name="Original", unit="cm")
    response = auth.patch(f"/api/attributes/{attr['id']}", json={"name": "Nuevo", "region": "head", "unit": "mm"})
    assert response.status_code == 200
    body = response.json()
    assert (body["name"], body["region"], body["unit"], body["key"]) == ("Nuevo", "head", "mm", attr["key"])
    assert auth.patch(f"/api/attributes/{attr['id']}", json={"name": None}).status_code == 422
    assert auth.patch(f"/api/attributes/{attr['id']}", json={"data_type": "text"}).json()["data_type"] == "number"


def test_patch_select_options(make_attribute: Factory, auth: TestClient) -> None:
    attr = make_attribute(name="Sel", data_type="select", options=["a", "b"])
    assert auth.patch(f"/api/attributes/{attr['id']}", json={"options": ["a", "b", "c"]}).json()["options"] == ["a", "b", "c"]
    assert auth.patch(f"/api/attributes/{attr['id']}", json={"options": ["a"]}).status_code == 422


def test_patch_and_delete_missing(auth: TestClient) -> None:
    assert auth.patch("/api/attributes/99999", json={"history_enabled": False}).status_code == 404
    assert auth.delete("/api/attributes/99999").status_code == 404
    assert auth.get("/api/attributes/99999/entries").status_code == 404


def test_custom_delete_cascades(make_attribute: Factory, add_entry: Callable[..., Any], auth: TestClient, db_engine) -> None:
    attr = make_attribute(name="Temporal")
    add_entry(attr["id"], value_number=1)
    add_entry(attr["id"], value_number=2)
    assert auth.delete(f"/api/attributes/{attr['id']}").status_code == 204
    assert all(a["id"] != attr["id"] for a in auth.get("/api/attributes").json())
    with db_engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM entries")).scalar_one() == 0
