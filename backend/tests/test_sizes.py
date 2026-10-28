from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

Builtin = Callable[[str], dict[str, Any]]
Add = Callable[..., Any]


@pytest.mark.parametrize("label", ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"])
def test_alpha_sizes(builtin: Builtin, add_entry: Add, label: str) -> None:
    entry = add_entry(builtin("tshirt")["id"], value_text=label, unit="ALPHA")
    assert entry["value_text"] == label and entry["unit"] == "ALPHA" and entry["value_number"] is None


def test_alpha_default_system_and_case(builtin: Builtin, add_entry: Add) -> None:
    entry = add_entry(builtin("hoodie")["id"], value_text="xl")
    assert (entry["value_text"], entry["unit"]) == ("XL", "ALPHA")


@pytest.mark.parametrize("label", ["5XL", "XXXL", "", "42", "Medium"])
def test_invalid_alpha_rejected(builtin: Builtin, add_entry: Add, label: str) -> None:
    add_entry(builtin("tshirt")["id"], expect=422, value_text=label, unit="ALPHA")


@pytest.mark.parametrize(
    ("key", "unit", "label"),
    [("shoes", "EU", "42"), ("shoes", "US", "9.5"), ("shoes", "UK", "8,5"), ("cap", "NUM", "58"), ("pants", "NUM", "44")],
)
def test_numeric_systems(builtin: Builtin, add_entry: Add, key: str, unit: str, label: str) -> None:
    entry = add_entry(builtin(key)["id"], value_text=label, unit=unit)
    assert entry["value_text"] == label and entry["unit"] == unit


def test_default_system_per_kind(builtin: Builtin, add_entry: Add) -> None:
    assert add_entry(builtin("shoes")["id"], value_text="41")["unit"] == "EU"
    assert add_entry(builtin("cap")["id"], value_text="57")["unit"] == "NUM"
    assert add_entry(builtin("gloves")["id"], value_text="M")["unit"] == "ALPHA"


@pytest.mark.parametrize("label", ["abc", "4a", "1234", "9.55", "-3"])
def test_invalid_numeric_rejected(builtin: Builtin, add_entry: Add, label: str) -> None:
    response = add_entry(builtin("shoes")["id"], expect=422, value_text=label, unit="EU")
    assert isinstance(response["detail"], str)


def test_invalid_system_rejected(builtin: Builtin, add_entry: Add) -> None:
    add_entry(builtin("shoes")["id"], expect=422, value_text="42", unit="JP")
    add_entry(builtin("shoes")["id"], expect=422, value_text="42", unit="WL")


def test_pants_wl_is_composed(builtin: Builtin, add_entry: Add) -> None:
    pants = builtin("pants")["id"]
    entry = add_entry(pants, unit="WL", details={"waist": 32, "length": 30})
    assert entry["value_text"] == "W32/L30" and entry["unit"] == "WL"
    assert entry["details"] == {"waist": 32, "length": 30}
    ignored = add_entry(pants, unit="WL", value_text="ignored", details={"waist": 30.5, "length": 32})
    assert ignored["value_text"] == "W30.5/L32"


def test_wl_inferred_from_details(builtin: Builtin, add_entry: Add) -> None:
    entry = add_entry(builtin("pants")["id"], details={"waist": 34, "length": 32})
    assert (entry["unit"], entry["value_text"]) == ("WL", "W34/L32")


def test_wl_requirements(builtin: Builtin, add_entry: Add) -> None:
    pants = builtin("pants")["id"]
    add_entry(pants, expect=422, unit="WL")
    add_entry(pants, expect=422, unit="WL", details={"waist": 32})
    add_entry(pants, expect=422, unit="WL", details={"length": 30})
    add_entry(pants, expect=422, unit="WL", details={"waist": "x", "length": 30})
    add_entry(pants, expect=422, unit="WL", details={"waist": 0, "length": 30})
    add_entry(builtin("shorts")["id"], expect=422, unit="WL", details={"waist": 32, "length": 30})
    add_entry(pants, expect=422, unit="NUM", value_text="44", details={"waist": 32, "length": 30})


def test_brand_model_fit_stored(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    details = {"brand": "Marca", "model": "Slim 501", "fit": "Ajustado"}
    entry = add_entry(builtin("tshirt")["id"], value_text="M", details=details | {"fit": " Ajustado ", "model": ""})
    assert entry["details"] == {"brand": "Marca", "fit": "Ajustado"}
    full = add_entry(builtin("pants")["id"], unit="WL", details=details | {"waist": 32, "length": 30})
    assert full["details"] == details | {"waist": 32, "length": 30}
    stored = auth.get(f"/api/attributes/{builtin('pants')['id']}/entries").json()[0]
    assert stored["details"] == full["details"]


def test_details_validation(builtin: Builtin, add_entry: Add) -> None:
    tshirt = builtin("tshirt")["id"]
    assert add_entry(tshirt, expect=422, value_text="M", details={"brand": "x" * 81})["detail"]
    assert add_entry(tshirt, expect=422, value_text="M", details={"color": "rojo"})["detail"]
    add_entry(builtin("weight")["id"], expect=422, value_number=70, details={"brand": "x"})


def test_size_rejects_foreign_values(builtin: Builtin, add_entry: Add) -> None:
    add_entry(builtin("tshirt")["id"], expect=422, value_text="M", value_number=3)
    add_entry(builtin("tshirt")["id"], expect=422, value_bool=True)


def test_no_cross_system_conversion(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    shoes = builtin("shoes")["id"]
    add_entry(shoes, value_text="42", unit="EU")
    add_entry(shoes, value_text="9.5", unit="US")
    add_entry(shoes, value_text="8", unit="UK")
    values = {(e["unit"], e["value_text"]) for e in auth.get(f"/api/attributes/{shoes}/entries").json()}
    assert values == {("EU", "42"), ("US", "9.5"), ("UK", "8")}


def test_patch_size_entry(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    entry = add_entry(builtin("tshirt")["id"], value_text="M", details={"brand": "A"})
    body = auth.patch(f"/api/entries/{entry['id']}", json={"value_text": "L"}).json()
    assert body["value_text"] == "L" and body["details"] == {"brand": "A"} and body["unit"] == "ALPHA"
    assert auth.patch(f"/api/entries/{entry['id']}", json={"value_text": "ZZ"}).status_code == 422
    body = auth.patch(f"/api/entries/{entry['id']}", json={"details": None}).json()
    assert body["details"] is None


def test_patch_wl_entry(auth: TestClient, builtin: Builtin, add_entry: Add) -> None:
    entry = add_entry(builtin("pants")["id"], details={"waist": 32, "length": 30})
    body = auth.patch(f"/api/entries/{entry['id']}", json={"details": {"waist": 34, "length": 30}}).json()
    assert body["value_text"] == "W34/L30"


def test_custom_size_attribute(make_attribute: Callable[..., dict[str, Any]], add_entry: Add) -> None:
    ring = make_attribute(name="Anillos", data_type="size", region="hands", size_kind="numeric")
    assert add_entry(ring["id"], value_text="17")["unit"] == "NUM"
    add_entry(ring["id"], expect=422, unit="WL", details={"waist": 1, "length": 1})
