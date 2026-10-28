import type { Attribute, DataType, Entry, SizeKind, SizeSystem } from "../api/types";

export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const todayISO = (): string => {
  const n = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);

export const parseDecimal = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
};

export const ALPHA_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"] as const;

export const SIZE_SYSTEMS: { key: SizeSystem; label: string }[] = [
  { key: "ALPHA", label: "Letras (S, M, L)" },
  { key: "NUM", label: "Numérico" },
  { key: "EU", label: "EU" },
  { key: "US", label: "US" },
  { key: "UK", label: "UK" },
  { key: "WL", label: "Cintura/largo (W/L)" },
];

export const SIZE_KINDS: { key: SizeKind; label: string }[] = [
  { key: "alpha", label: "Letras (S, M, L)" },
  { key: "numeric", label: "Numérico" },
  { key: "shoe", label: "Calzado" },
  { key: "pants", label: "Pantalón" },
  { key: "hat", label: "Gorra" },
  { key: "glove", label: "Guante" },
];

export const DATA_TYPES: { key: DataType; label: string }[] = [
  { key: "number", label: "Número" },
  { key: "text", label: "Texto" },
  { key: "select", label: "Selección" },
  { key: "boolean", label: "Sí / No" },
  { key: "size", label: "Talle" },
];

export const availableSystems = (kind: SizeKind | null) =>
  SIZE_SYSTEMS.filter((s) => s.key !== "WL" || kind === "pants");

export const defaultSystem = (kind: SizeKind | null): SizeSystem =>
  kind === "numeric" || kind === "pants" ? "NUM" : kind === "shoe" ? "EU" : "ALPHA";

export const formatSize = (e: Entry): string => {
  const label = e.value_text ?? "";
  if (e.unit === "EU" || e.unit === "US" || e.unit === "UK") return `${e.unit} ${label}`;
  return label;
};

export const formatValue = (attr: Pick<Attribute, "data_type" | "unit">, e: Entry): string => {
  switch (attr.data_type) {
    case "number": {
      if (e.value_number === null) return "—";
      const unit = e.unit ?? attr.unit;
      return unit ? `${formatNumber(e.value_number)} ${unit}` : formatNumber(e.value_number);
    }
    case "boolean":
      return e.value_bool === null ? "—" : e.value_bool ? "Sí" : "No";
    case "size":
      return formatSize(e);
    default:
      return e.value_text ?? "—";
  }
};

export const sizeSubtitle = (e: Entry): string =>
  [e.details?.brand, e.details?.model, e.details?.fit].filter(Boolean).join(" · ");
