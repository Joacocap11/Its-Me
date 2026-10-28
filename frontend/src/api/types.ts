export type DataType = "number" | "text" | "select" | "boolean" | "size" | "prescription";
export type Region =
  | "head" | "eyes" | "neck" | "shoulders" | "chest" | "arms"
  | "hands" | "waist" | "hips" | "legs" | "feet" | "full_body";
export type SizeKind = "alpha" | "numeric" | "shoe" | "pants" | "hat" | "glove";
export type SizeSystem = "ALPHA" | "NUM" | "EU" | "US" | "UK" | "WL";

export interface SizeDetails {
  brand?: string | null;
  model?: string | null;
  fit?: string | null;
  waist?: number | null;
  length?: number | null;
}

export type Eye = "od" | "oi";
export type EyeCondition = "myopia" | "astigmatism" | "both" | "other";

export interface EyeRx {
  condition?: EyeCondition | null;
  sph?: number | null;
  cyl?: number | null;
  axis?: number | null;
  add?: number | null;
  notes?: string | null;
}

export interface PrescriptionDetails {
  od?: EyeRx | null;
  oi?: EyeRx | null;
}

export interface EntryDetails extends SizeDetails, PrescriptionDetails {}

export interface Entry {
  id: number;
  attribute_id: number;
  value_number: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  unit: string | null;
  details: EntryDetails | null;
  measured_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attribute {
  id: number;
  key: string;
  name: string;
  data_type: DataType;
  region: Region;
  unit: string | null;
  options: string[] | null;
  size_kind: SizeKind | null;
  history_enabled: boolean;
  builtin: boolean;
  sort_order: number;
  created_at: string;
  latest_entry: Entry | null;
  current_entries: Entry[];
  entry_count: number;
}

export interface AttributeInput {
  name: string;
  data_type: DataType;
  region: Region;
  unit?: string | null;
  options?: string[] | null;
  size_kind?: SizeKind | null;
  history_enabled?: boolean;
}

export type AttributePatch = Partial<Pick<AttributeInput, "name" | "region" | "unit" | "options" | "history_enabled">>;

export interface EntryInput {
  attribute_id?: number;
  value_number?: number | null;
  value_text?: string | null;
  value_bool?: boolean | null;
  unit?: string | null;
  details?: EntryDetails | null;
  measured_on?: string;
  notes?: string | null;
}

export interface AuthStatus {
  configured: boolean;
  authenticated: boolean;
  username: string | null;
}
