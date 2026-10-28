"""Tablas iniciales y definiciones de atributos predefinidos

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

MEASUREMENTS = [
    ("weight", "Peso", "kg", "full_body"),
    ("height", "Altura", "cm", "full_body"),
    ("chest_circumference", "Contorno de pecho", "cm", "chest"),
    ("waist_circumference", "Contorno de cintura", "cm", "waist"),
    ("hip_circumference", "Contorno de cadera", "cm", "hips"),
    ("shoulder_width", "Ancho de hombros", "cm", "shoulders"),
    ("arm_length", "Largo de brazos", "cm", "arms"),
    ("inseam", "Entrepierna", "cm", "legs"),
    ("head_circumference", "Circunferencia de cabeza", "cm", "head"),
    ("foot_length", "Longitud del pie", "cm", "feet"),
]

SIZES = [
    ("tshirt", "Remeras", "chest", "alpha"),
    ("dress_shirt", "Camisas", "chest", "alpha"),
    ("hoodie", "Buzos", "chest", "alpha"),
    ("jacket", "Camperas", "shoulders", "alpha"),
    ("pants", "Pantalones", "legs", "pants"),
    ("shorts", "Shorts", "legs", "alpha"),
    ("underwear", "Ropa interior", "hips", "alpha"),
    ("shoes", "Calzado", "feet", "shoe"),
    ("cap", "Gorras", "head", "hat"),
    ("gloves", "Guantes", "hands", "glove"),
]


def upgrade() -> None:
    attributes = op.create_table(
        "attributes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("key", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("data_type", sa.String(16), nullable=False),
        sa.Column("region", sa.String(16), nullable=False),
        sa.Column("unit", sa.String(16)),
        sa.Column("options", sa.JSON),
        sa.Column("size_kind", sa.String(16)),
        sa.Column("history_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("builtin", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "entries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("attribute_id", sa.Integer, sa.ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value_number", sa.Numeric(16, 4)),
        sa.Column("value_text", sa.String(500)),
        sa.Column("value_bool", sa.Boolean),
        sa.Column("unit", sa.String(16)),
        sa.Column("details", sa.JSON),
        sa.Column("measured_on", sa.Date, nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_entries_attribute_measured", "entries", ["attribute_id", "measured_on"])
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("username", sa.String(40), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    rows = [
        {"key": key, "name": name, "data_type": "number", "region": region, "unit": unit, "size_kind": None}
        for key, name, unit, region in MEASUREMENTS
    ] + [
        {"key": key, "name": name, "data_type": "size", "region": region, "unit": None, "size_kind": kind}
        for key, name, region, kind in SIZES
    ]
    op.bulk_insert(attributes, [{**row, "builtin": True, "sort_order": i} for i, row in enumerate(rows, start=1)])


def downgrade() -> None:
    op.drop_table("users")
    op.drop_table("entries")
    op.drop_table("attributes")
