from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import DataType, Entry
from app.routers.attributes import get_attribute
from app.schemas import EntryCreate, EntryOut, EntryUpdate
from app.services import details_data, entry_data, normalize_entry, size_context

router = APIRouter(prefix="/entries")

VALUE_FIELDS = ("value_number", "value_text", "value_bool", "unit")


def _get_entry(db: Session, entry_id: int) -> Entry:
    entry = db.get(Entry, entry_id)
    if entry is None:
        raise HTTPException(404, "Registro no encontrado")
    return entry


@router.post("", status_code=201)
def create_entry(body: EntryCreate, db: Session = Depends(get_db)) -> EntryOut:
    attr = get_attribute(db, body.attribute_id)
    data = {f: getattr(body, f) for f in VALUE_FIELDS} | {"details": details_data(body.details)}
    values = normalize_entry(attr, data)
    if not attr.history_enabled:
        context = size_context(values["unit"], values["details"])
        replaced = [
            e.id
            for e in db.scalars(select(Entry).where(Entry.attribute_id == attr.id))
            if attr.data_type is not DataType.size or size_context(e.unit, e.details) == context
        ]
        db.execute(delete(Entry).where(Entry.id.in_(replaced)))
    entry = Entry(attribute_id=attr.id, measured_on=body.measured_on, notes=body.notes or None, **values)
    db.add(entry)
    db.commit()
    return EntryOut.model_validate(entry)


@router.patch("/{entry_id}")
def update_entry(entry_id: int, body: EntryUpdate, db: Session = Depends(get_db)) -> EntryOut:
    entry = _get_entry(db, entry_id)
    changes = body.model_dump(exclude_unset=True)
    if "details" in changes:
        changes["details"] = details_data(body.details)
    data = entry_data(entry) | {k: v for k, v in changes.items() if k in (*VALUE_FIELDS, "details")}
    for field, value in normalize_entry(entry.attribute, data).items():
        setattr(entry, field, value)
    if changes.get("measured_on"):
        entry.measured_on = changes["measured_on"]
    if "notes" in changes:
        entry.notes = changes["notes"] or None
    entry.updated_at = datetime.now(UTC)
    db.commit()
    return EntryOut.model_validate(entry)


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get_entry(db, entry_id))
    db.commit()
