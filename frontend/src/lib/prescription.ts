import type { Eye, EyeCondition, EyeRx } from "../api/types";

export const EYES: { key: Eye; short: string; label: string }[] = [
  { key: "od", short: "OD", label: "Ojo derecho" },
  { key: "oi", short: "OI", label: "Ojo izquierdo" },
];

export const CONDITIONS: { key: EyeCondition; label: string }[] = [
  { key: "myopia", label: "Miopía" },
  { key: "astigmatism", label: "Astigmatismo" },
  { key: "both", label: "Miopía y astigmatismo" },
  { key: "other", label: "Otra" },
];

export const ABBREVIATIONS: { term: string; meaning: string }[] = [
  { term: "SPH", meaning: "Esfera: potencia de la lente en dioptrías. Puede ser negativa, positiva o cero." },
  { term: "CYL", meaning: "Cilindro: potencia adicional para el astigmatismo, en dioptrías. Lleva signo." },
  { term: "AXIS", meaning: "Eje: orientación del cilindro, en grados de 0 a 180. Solo aplica si hay CYL." },
  { term: "ADD", meaning: "Adición: potencia extra para visión cercana, en dioptrías. Es opcional." },
  { term: "OD / OI", meaning: "Ojo derecho / ojo izquierdo." },
];

const diopter = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });

export const formatDiopter = (n: number): string => diopter.format(n);

export const conditionLabel = (c?: EyeCondition | null): string => CONDITIONS.find((o) => o.key === c)?.label ?? "";

export const eyeMeasures = (eye: EyeRx): { label: string; value: string }[] =>
  [
    { label: "SPH", value: eye.sph, text: (n: number) => formatDiopter(n) },
    { label: "CYL", value: eye.cyl, text: (n: number) => formatDiopter(n) },
    { label: "AXIS", value: eye.axis, text: (n: number) => `${n}°` },
    { label: "ADD", value: eye.add, text: (n: number) => formatDiopter(n) },
  ].flatMap(({ label, value, text }) => (value === null || value === undefined ? [] : [{ label, value: text(value) }]));

export interface EyeForm {
  condition: EyeCondition | "";
  sph: string;
  cyl: string;
  axis: string;
  add: string;
  notes: string;
}

export const emptyEyeForm = (): EyeForm => ({ condition: "", sph: "", cyl: "", axis: "", add: "", notes: "" });

export const eyeToForm = (eye?: EyeRx | null): EyeForm => {
  const str = (n?: number | null) => (n === null || n === undefined ? "" : String(n).replace(".", ","));
  return {
    condition: eye?.condition ?? "",
    sph: str(eye?.sph),
    cyl: str(eye?.cyl),
    axis: str(eye?.axis),
    add: str(eye?.add),
    notes: eye?.notes ?? "",
  };
};

export const isEyeFormEmpty = (f: EyeForm): boolean =>
  !f.condition && ![f.sph, f.cyl, f.axis, f.add, f.notes].some((v) => v.trim());

const parseSigned = (s: string): number | null => (/^[+-]?\d+([.,]\d+)?$/.test(s.trim()) ? Number(s.trim().replace(",", ".")) : null);

const RANGES = { sph: [-30, 30, "SPH"], cyl: [-15, 15, "CYL"], add: [0, 10, "ADD"] } as const;

export const validateEye = (f: EyeForm): Partial<Record<"sph" | "cyl" | "axis" | "add", string>> => {
  const errors: Partial<Record<"sph" | "cyl" | "axis" | "add", string>> = {};
  for (const key of ["sph", "cyl", "add"] as const) {
    if (!f[key].trim()) continue;
    const [min, max, name] = RANGES[key];
    const n = parseSigned(f[key]);
    if (n === null) errors[key] = `${name}: ingresá un número, por ejemplo -2,25`;
    else if (n < min || n > max) errors[key] = `${name}: debe estar entre ${min} y ${max}`;
  }
  if (f.axis.trim() && !(/^\d{1,3}$/.test(f.axis.trim()) && Number(f.axis) <= 180)) errors.axis = "AXIS: entero entre 0 y 180";
  return errors;
};

export const buildEye = (f: EyeForm): EyeRx | null => {
  if (isEyeFormEmpty(f)) return null;
  const eye: EyeRx = {};
  if (f.condition) eye.condition = f.condition;
  for (const key of ["sph", "cyl", "add"] as const) if (f[key].trim()) eye[key] = parseSigned(f[key]);
  if (f.axis.trim()) eye.axis = Number(f.axis);
  if (f.notes.trim()) eye.notes = f.notes.trim();
  return eye;
};
