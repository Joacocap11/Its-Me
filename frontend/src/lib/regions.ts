import type { Attribute, Region } from "../api/types";

export const REGIONS: { key: Region; label: string }[] = [
  { key: "head", label: "Cabeza" },
  { key: "eyes", label: "Ojos" },
  { key: "neck", label: "Cuello" },
  { key: "shoulders", label: "Hombros" },
  { key: "chest", label: "Pecho" },
  { key: "arms", label: "Brazos" },
  { key: "hands", label: "Manos" },
  { key: "waist", label: "Cintura" },
  { key: "hips", label: "Caderas" },
  { key: "legs", label: "Piernas" },
  { key: "feet", label: "Pies" },
  { key: "full_body", label: "Cuerpo completo" },
];

export const regionLabel = (r: Region): string => REGIONS.find((x) => x.key === r)?.label ?? r;

export const attributesInRegion = (attrs: Attribute[], region: Region): Attribute[] =>
  attrs.filter((a) => a.region === region).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

export const regionsWithData = (attrs: Attribute[]): Set<Region> =>
  new Set(attrs.filter((a) => a.latest_entry).map((a) => a.region));

const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export const matchesQuery = (name: string, query: string): boolean => normalize(name).includes(normalize(query));
