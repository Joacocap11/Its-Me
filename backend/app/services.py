import math
import re
import unicodedata
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import Session

from app.models import Attribute, DataType, Entry, SizeKind
from app.schemas import AttributeOut, EntryOut

ALPHA_SIZES = ("XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL")
SIZE_SYSTEMS = ("ALPHA", "NUM", "EU", "US", "UK", "WL")
DEFAULT_SYSTEM = {
    SizeKind.alpha: "ALPHA",
    SizeKind.numeric: "NUM",
    SizeKind.shoe: "EU",
    SizeKind.pants: "NUM",
    SizeKind.hat: "NUM",
    SizeKind.glove: "ALPHA",
}
NUMERIC_SIZE_RE = re.compile(r"^\d{1,3}([.,]\d)?$")
BOUNDED_UNITS = ("cm", "kg")


def invalid(message: str) -> HTTPException:
    return HTTPException(422, message)


def slugify(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", ascii_name.lower()).strip("_")[:50] or "atributo"


def unique_key(db: Session, name: str) -> str:
    base = slugify(name)
    taken = set(db.scalars(select(Attribute.key).where(Attribute.key.like(f"{base}%"))))
    key, n = base, 1
    while key in taken:
        n += 1
        key = f"{base}_{n}"
    return key


def _number(attr: Attribute, data: dict[str, Any]) -> dict[str, Any]:
    value = data["value_number"]
    unit = data["unit"] or attr.unit
    if value is None:
        raise invalid("Ingresá un valor numérico")
    if attr.builtin or unit in BOUNDED_UNITS:
        if not 0 < value <= 1000:
            raise invalid("El valor debe ser mayor que 0 y no superar 1000")
    elif not math.isfinite(value) or abs(value) >= 1e9:
        raise invalid("El valor numérico está fuera de rango")
    return {"value_number": value, "unit": unit}


def _size(attr: Attribute, data: dict[str, Any]) -> dict[str, Any]:
    details = dict(data["details"] or {})
    waist_length = ("waist" in details) or ("length" in details)
    system = data["unit"] or ("WL" if waist_length else DEFAULT_SYSTEM[attr.size_kind or SizeKind.alpha])
    if system not in SIZE_SYSTEMS:
        raise invalid("Sistema de talle no válido")
    if system == "WL":
        if attr.size_kind is not SizeKind.pants:
            raise invalid("El sistema W/L solo aplica a pantalones")
        if "waist" not in details or "length" not in details:
            raise invalid("Indicá cintura y largo para el talle W/L")
        text = f"W{details['waist']:g}/L{details['length']:g}"
    else:
        if waist_length:
            raise invalid("Cintura y largo solo aplican al sistema W/L")
        text = (data["value_text"] or "").upper()
        if system == "ALPHA":
            if text not in ALPHA_SIZES:
                raise invalid(f"El talle debe ser uno de: {', '.join(ALPHA_SIZES)}")
        elif not NUMERIC_SIZE_RE.match(text):
            raise invalid("El talle debe ser numérico, por ejemplo 42 o 9.5")
    return {"value_text": text, "unit": system, "details": details or None}


def normalize_entry(attr: Attribute, data: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        DataType.number: ("value_number", "unit"),
        DataType.text: ("value_text",),
        DataType.select: ("value_text",),
        DataType.boolean: ("value_bool",),
        DataType.size: ("value_text", "unit", "details"),
    }[attr.data_type]
    if any(data[f] not in (None, "") for f in ("value_number", "value_text", "value_bool", "details") if f not in allowed):
        raise invalid("El valor no corresponde al tipo del atributo")

    out: dict[str, Any] = {"value_number": None, "value_text": None, "value_bool": None, "unit": None, "details": None}
    match attr.data_type:
        case DataType.number:
            out |= _number(attr, data)
        case DataType.text:
            if not data["value_text"]:
                raise invalid("Ingresá un texto")
            out["value_text"] = data["value_text"]
        case DataType.select:
            if data["value_text"] not in (attr.options or []):
                raise invalid("La opción no es válida para este atributo")
            out["value_text"] = data["value_text"]
        case DataType.boolean:
            if data["value_bool"] is None:
                raise invalid("Indicá si es verdadero o falso")
            out["value_bool"] = data["value_bool"]
        case DataType.size:
            out |= _size(attr, data)
    return out


def entry_data(entry: Entry) -> dict[str, Any]:
    return {
        "value_number": float(entry.value_number) if entry.value_number is not None else None,
        "value_text": entry.value_text,
        "value_bool": entry.value_bool,
        "unit": entry.unit,
        "details": entry.details,
    }


def details_data(details: Any) -> dict[str, Any] | None:
    if details is None:
        return None
    return {k: v for k, v in details.model_dump().items() if v not in (None, "")} or None


def attribute_outs(db: Session, attributes: list[Attribute]) -> list[AttributeOut]:
    ids = [a.id for a in attributes]
    latest = {
        e.attribute_id: e
        for e in db.scalars(
            select(Entry)
            .where(Entry.attribute_id.in_(ids))
            .ext(distinct_on(Entry.attribute_id))
            .order_by(Entry.attribute_id, Entry.measured_on.desc(), Entry.id.desc())
        )
    }
    counts = dict(
        db.execute(
            select(Entry.attribute_id, func.count()).where(Entry.attribute_id.in_(ids)).group_by(Entry.attribute_id)
        ).all()
    )
    result = []
    for attr in attributes:
        out = AttributeOut.model_validate(attr)
        out.latest_entry = EntryOut.model_validate(latest[attr.id]) if attr.id in latest else None
        out.entry_count = counts.get(attr.id, 0)
        result.append(out)
    return result
