import re
from datetime import UTC, date, datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import DataType, Region, SizeKind

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,40}$")


def _clean_options(options: list[str] | None) -> list[str] | None:
    if options is None:
        return None
    cleaned = [o.strip() for o in options]
    if any(not o or len(o) > 60 for o in cleaned):
        raise ValueError("Cada opción debe tener entre 1 y 60 caracteres")
    if len(set(cleaned)) != len(cleaned):
        raise ValueError("Las opciones no pueden repetirse")
    if len(cleaned) > 50:
        raise ValueError("Se admiten hasta 50 opciones")
    return cleaned


def _not_future(value: date | None) -> date | None:
    if value is not None and value > datetime.now(UTC).date():
        raise ValueError("La fecha no puede ser futura")
    return value


class Credentials(BaseModel):
    username: str = Field(max_length=40)
    password: str = Field(max_length=128)


class SetupRequest(BaseModel):
    username: str
    password: str = Field(min_length=10, max_length=128)

    @field_validator("username")
    @classmethod
    def _username(cls, value: str) -> str:
        if not USERNAME_RE.match(value):
            raise ValueError("El usuario debe tener de 3 a 40 caracteres: letras, números, punto, guion o guion bajo")
        return value


class UserOut(BaseModel):
    username: str


class AuthStatus(BaseModel):
    configured: bool
    authenticated: bool
    username: str | None


class EntryDetails(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    brand: str | None = Field(None, max_length=80)
    model: str | None = Field(None, max_length=80)
    fit: str | None = Field(None, max_length=80)
    waist: float | None = Field(None, gt=0, le=300)
    length: float | None = Field(None, gt=0, le=300)


class EntryFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    value_number: float | None = Field(None, allow_inf_nan=False)
    value_text: str | None = Field(None, max_length=500)
    value_bool: bool | None = None
    unit: str | None = Field(None, max_length=16)
    details: EntryDetails | None = None
    notes: str | None = Field(None, max_length=2000)


class EntryCreate(EntryFields):
    attribute_id: int
    measured_on: Annotated[date, AfterValidator(_not_future)]


class EntryUpdate(EntryFields):
    measured_on: Annotated[date | None, AfterValidator(_not_future)] = None


class EntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    attribute_id: int
    value_number: float | None
    value_text: str | None
    value_bool: bool | None
    unit: str | None
    details: dict[str, Any] | None
    measured_on: date
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AttributeCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=80)
    data_type: DataType
    region: Region
    unit: str | None = Field(None, max_length=16)
    options: Annotated[list[str] | None, AfterValidator(_clean_options)] = None
    size_kind: SizeKind | None = None
    history_enabled: bool = True

    @model_validator(mode="after")
    def _by_type(self) -> "AttributeCreate":
        if self.data_type is DataType.select and (self.options is None or len(self.options) < 2):
            raise ValueError("Una lista de opciones requiere al menos 2 opciones")
        return self


class AttributeUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(None, min_length=1, max_length=80)
    region: Region | None = None
    unit: str | None = Field(None, max_length=16)
    options: Annotated[list[str] | None, AfterValidator(_clean_options)] = None
    history_enabled: bool | None = None


class AttributeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    data_type: DataType
    region: Region
    unit: str | None
    options: list[str] | None
    size_kind: SizeKind | None
    history_enabled: bool
    builtin: bool
    sort_order: int
    created_at: datetime
    latest_entry: EntryOut | None = None
    current_entries: list[EntryOut] = []
    entry_count: int = 0
