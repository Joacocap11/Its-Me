from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Attribute, DataType, Entry, SizeKind
from app.schemas import AttributeCreate, AttributeOut, AttributeUpdate, EntryOut
from app.services import attribute_outs, invalid, unique_key

router = APIRouter(prefix="/attributes")


def get_attribute(db: Session, attribute_id: int) -> Attribute:
    attr = db.get(Attribute, attribute_id)
    if attr is None:
        raise HTTPException(404, "Atributo no encontrado")
    return attr


def _check_unit_and_options(data_type: DataType, unit: str | None, options: list[str] | None) -> None:
    if unit and data_type is not DataType.number:
        raise invalid("Solo los atributos numéricos admiten unidad")
    if options and data_type is not DataType.select:
        raise invalid("Solo las listas de opciones admiten opciones")


@router.get("")
def list_attributes(db: Session = Depends(get_db)) -> list[AttributeOut]:
    attributes = list(db.scalars(select(Attribute).order_by(Attribute.sort_order, Attribute.id)))
    return attribute_outs(db, attributes)


@router.post("", status_code=201)
def create_attribute(body: AttributeCreate, db: Session = Depends(get_db)) -> AttributeOut:
    if body.data_type is DataType.prescription:
        raise invalid("Las graduaciones solo están disponibles como atributo predefinido")
    _check_unit_and_options(body.data_type, body.unit, body.options)
    is_size = body.data_type is DataType.size
    attr = Attribute(
        key=unique_key(db, body.name),
        name=body.name,
        data_type=body.data_type,
        region=body.region,
        unit=body.unit or None,
        options=body.options if body.data_type is DataType.select else None,
        size_kind=(body.size_kind or SizeKind.alpha) if is_size else None,
        history_enabled=body.history_enabled,
        builtin=False,
        sort_order=db.scalar(select(func.coalesce(func.max(Attribute.sort_order), 0) + 1)),
    )
    db.add(attr)
    db.commit()
    return attribute_outs(db, [attr])[0]


@router.patch("/{attribute_id}")
def update_attribute(attribute_id: int, body: AttributeUpdate, db: Session = Depends(get_db)) -> AttributeOut:
    attr = get_attribute(db, attribute_id)
    changes = body.model_dump(exclude_unset=True)
    if attr.builtin and changes.keys() - {"history_enabled"}:
        raise HTTPException(400, "Los atributos predefinidos solo permiten cambiar el historial")
    if any(changes.get(f, 0) is None for f in ("name", "region", "history_enabled")):
        raise invalid("Nombre, región e historial no pueden ser nulos")
    if attr.data_type is DataType.prescription and changes.get("history_enabled") is False:
        raise invalid("Las graduaciones siempre conservan su historial")
    _check_unit_and_options(attr.data_type, changes.get("unit"), changes.get("options"))
    if "unit" in changes:
        changes["unit"] = changes["unit"] or None
    if attr.data_type is DataType.select and "options" in changes and len(changes["options"] or []) < 2:
        raise invalid("Una lista de opciones requiere al menos 2 opciones")
    if attr.data_type is not DataType.select:
        changes.pop("options", None)
    for field, value in changes.items():
        setattr(attr, field, value)
    db.commit()
    return attribute_outs(db, [attr])[0]


@router.delete("/{attribute_id}", status_code=204)
def delete_attribute(attribute_id: int, db: Session = Depends(get_db)) -> None:
    attr = get_attribute(db, attribute_id)
    if attr.builtin:
        raise HTTPException(409, "Los atributos predefinidos no se pueden eliminar")
    db.delete(attr)
    db.commit()


@router.get("/{attribute_id}/entries")
def list_entries(attribute_id: int, db: Session = Depends(get_db)) -> list[EntryOut]:
    get_attribute(db, attribute_id)
    entries = db.scalars(
        select(Entry).where(Entry.attribute_id == attribute_id).order_by(Entry.measured_on.desc(), Entry.id.desc())
    )
    return [EntryOut.model_validate(e) for e in entries]
