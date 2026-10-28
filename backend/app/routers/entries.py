from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Entry
from app.routers.attributes import get_attribute
from app.schemas import EntryCreate, EntryOut, EntryUpdate
from app.services import details_data, entry_data, normalize_entry

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
    if not attr.history_enabled:
        db.execute(delete(Entry).where(Entry.attribute_id == attr.id))
    entry = Entry(attribute_id=attr.id, measured_on=body.measured_on, notes=body.notes or None, **normalize_entry(attr, data))
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
