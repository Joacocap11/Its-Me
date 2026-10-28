from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, false, func, true
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class DataType(StrEnum):
    number = "number"
    text = "text"
    select = "select"
    boolean = "boolean"
    size = "size"
    prescription = "prescription"


class Region(StrEnum):
    head = "head"
    eyes = "eyes"
    neck = "neck"
    shoulders = "shoulders"
    chest = "chest"
    arms = "arms"
    hands = "hands"
    waist = "waist"
    hips = "hips"
    legs = "legs"
    feet = "feet"
    full_body = "full_body"


class SizeKind(StrEnum):
    alpha = "alpha"
    numeric = "numeric"
    shoe = "shoe"
    pants = "pants"
    hat = "hat"
    glove = "glove"


def _enum(enum: type[StrEnum]) -> Enum:
    return Enum(enum, native_enum=False, length=16)


class Base(DeclarativeBase):
    type_annotation_map = {
        DataType: _enum(DataType),
        Region: _enum(Region),
        SizeKind: _enum(SizeKind),
    }


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(40), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Attribute(Base):
    __tablename__ = "attributes"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    data_type: Mapped[DataType]
    region: Mapped[Region]
    unit: Mapped[str | None] = mapped_column(String(16))
    options: Mapped[list[str] | None] = mapped_column(JSON)
    size_kind: Mapped[SizeKind | None]
    history_enabled: Mapped[bool] = mapped_column(server_default=true())
    builtin: Mapped[bool] = mapped_column(server_default=false())
    sort_order: Mapped[int] = mapped_column(server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="attribute", cascade="all, delete-orphan", passive_deletes=True
    )


class Entry(Base):
    __tablename__ = "entries"
    __table_args__ = (Index("ix_entries_attribute_measured", "attribute_id", "measured_on"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    attribute_id: Mapped[int] = mapped_column(ForeignKey("attributes.id", ondelete="CASCADE"))
    value_number: Mapped[Decimal | None] = mapped_column(Numeric(16, 4))
    value_text: Mapped[str | None] = mapped_column(String(500))
    value_bool: Mapped[bool | None]
    unit: Mapped[str | None] = mapped_column(String(16))
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    measured_on: Mapped[date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attribute: Mapped[Attribute] = relationship(back_populates="entries")
