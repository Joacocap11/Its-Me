import { useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import type { Attribute, Entry, EntryInput, SizeDetails, SizeSystem } from "../api/types";
import {
  ALPHA_SIZES,
  availableSystems,
  defaultSystem,
  parseDecimal,
  todayISO,
} from "../lib/format";
import { Field } from "./ui";

type Errors = Record<string, string>;

const SIZE_PATTERN = /^\d{1,3}([.,]\d)?$/;
const FIT_SUGGESTIONS = ["Ajustado", "Regular", "Holgado"];

const apiFieldMap: Record<string, string> = {
  value_number: "value",
  value_text: "value",
  value_bool: "value",
  unit: "system",
  measured_on: "date",
  "details.waist": "waist",
  "details.length": "length",
  "details.brand": "brand",
  "details.model": "model",
  "details.fit": "fit",
  notes: "notes",
};

interface Props {
  attribute: Attribute;
  entry?: Entry;
  onSaved: (entry: Entry) => void;
  onCancel: () => void;
}

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

export function EntryForm({ attribute, entry, onSaved, onCancel }: Props) {
  const seed = entry ?? attribute.latest_entry;
  const isSize = attribute.data_type === "size";
  const initialSystem = (seed?.unit as SizeSystem | null) ?? defaultSystem(attribute.size_kind);

  const [date, setDate] = useState(entry?.measured_on ?? todayISO());
  const [value, setValue] = useState(() => {
    if (!entry) return "";
    if (attribute.data_type === "number") return str(entry.value_number);
    return entry.value_text ?? "";
  });
  const [bool, setBool] = useState<boolean | null>(entry?.value_bool ?? null);
  const [system, setSystem] = useState<SizeSystem>(initialSystem);
  const [waist, setWaist] = useState(str(entry?.details?.waist));
  const [length, setLength] = useState(str(entry?.details?.length));
  const [brand, setBrand] = useState(seed?.details?.brand ?? "");
  const [model, setModel] = useState(seed?.details?.model ?? "");
  const [fit, setFit] = useState(seed?.details?.fit ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const systems = availableSystems(attribute.size_kind);
  const unit = attribute.unit;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!date) e.date = "Ingresá una fecha";
    else if (date > todayISO()) e.date = "La fecha no puede ser futura";
    switch (attribute.data_type) {
      case "number": {
        const n = parseDecimal(value);
        if (n === null) e.value = "Ingresá un número válido";
        else if (unit === "cm" || unit === "kg") {
          if (n <= 0 || n > 1000) e.value = "El valor debe ser mayor que 0 y menor o igual a 1000";
        }
        break;
      }
      case "text":
        if (!value.trim()) e.value = "Ingresá un valor";
        break;
      case "select":
        if (!value) e.value = "Elegí una opción";
        break;
      case "boolean":
        if (bool === null) e.value = "Elegí Sí o No";
        break;
      case "size":
        if (system === "WL") {
          for (const [k, v] of [["waist", waist], ["length", length]] as const) {
            const n = parseDecimal(v);
            if (n === null || n <= 0) e[k] = "Ingresá un número válido";
          }
        } else if (system === "ALPHA") {
          if (!value) e.value = "Elegí un talle";
        } else if (!SIZE_PATTERN.test(value.trim())) e.value = "Usá un número, por ejemplo 42 o 9,5";
        break;
    }
    return e;
  };

  const build = (): EntryInput => {
    const base: EntryInput = { measured_on: date, notes: notes.trim() || null };
    if (!entry) base.attribute_id = attribute.id;
    switch (attribute.data_type) {
      case "number":
        return { ...base, value_number: parseDecimal(value), unit: entry?.unit ?? unit };
      case "boolean":
        return { ...base, value_bool: bool };
      case "size": {
        const details: SizeDetails = {};
        if (brand.trim()) details.brand = brand.trim();
        if (model.trim()) details.model = model.trim();
        if (fit.trim()) details.fit = fit.trim();
        if (system === "WL") {
          details.waist = parseDecimal(waist);
          details.length = parseDecimal(length);
        }
        return {
          ...base,
          unit: system,
          ...(system === "WL" ? {} : { value_text: value.trim().replace(",", ".") }),
          details: Object.keys(details).length ? details : null,
        };
      }
      default:
        return { ...base, value_text: value.trim() };
    }
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = build();
      onSaved(entry ? await api.updateEntry(entry.id, body) : await api.createEntry(body));
    } catch (err) {
      if (err instanceof ApiError && err.issues.length) {
        const mapped: Errors = {};
        const rest: string[] = [];
        for (const [loc, msg] of Object.entries(err.fieldErrors())) {
          const field = apiFieldMap[loc];
          if (field) mapped[field] = msg;
          else rest.push(msg);
        }
        setErrors(mapped);
        if (rest.length) setFormError(rest.join(". "));
      } else setFormError(err instanceof Error ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  };

  const cls = (k: string) => `input ${errors[k] ? "input-error" : ""}`;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {!attribute.history_enabled && !entry && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Este atributo guarda solo el último valor: al guardar se reemplaza el anterior.
        </p>
      )}

      {isSize && (
        <Field label="Sistema de talles" error={errors.system}>
          {(p) => (
            <select
              {...p}
              className={cls("system")}
              value={system}
              onChange={(e) => {
                setSystem(e.target.value as SizeSystem);
                setValue("");
              }}
            >
              {systems.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {attribute.data_type === "number" && (
        <Field label={unit ? `Valor (${unit})` : "Valor"} error={errors.value}>
          {(p) => (
            <input {...p} className={cls("value")} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </Field>
      )}

      {attribute.data_type === "text" && (
        <Field label="Valor" error={errors.value}>
          {(p) => <input {...p} className={cls("value")} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} />}
        </Field>
      )}

      {attribute.data_type === "select" && (
        <Field label="Valor" error={errors.value}>
          {(p) => (
            <select {...p} className={cls("value")} value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Elegí una opción</option>
              {(attribute.options ?? []).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
        </Field>
      )}

      {attribute.data_type === "boolean" && (
        <div>
          <span className="label">Valor</span>
          <div className="flex gap-2" role="group" aria-label="Valor">
            {([true, false] as const).map((b) => (
              <button type="button" key={String(b)} className="chip flex-1 justify-center" aria-pressed={bool === b} onClick={() => setBool(b)}>
                {b ? "Sí" : "No"}
              </button>
            ))}
          </div>
          {errors.value && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.value}</p>}
        </div>
      )}

      {isSize && system === "ALPHA" && (
        <Field label="Talle" error={errors.value}>
          {(p) => (
            <select {...p} className={cls("value")} value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Elegí un talle</option>
              {ALPHA_SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </Field>
      )}

      {isSize && system === "WL" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cintura (W)" error={errors.waist}>
            {(p) => <input {...p} className={cls("waist")} inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />}
          </Field>
          <Field label="Largo (L)" error={errors.length}>
            {(p) => <input {...p} className={cls("length")} inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} />}
          </Field>
        </div>
      )}

      {isSize && system !== "ALPHA" && system !== "WL" && (
        <Field label="Talle" error={errors.value}>
          {(p) => (
            <input {...p} className={cls("value")} inputMode="decimal" placeholder="Ej.: 42 o 9,5" value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </Field>
      )}

      {isSize && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Marca (opcional)" error={errors.brand}>
            {(p) => <input {...p} className={cls("brand")} maxLength={80} value={brand} onChange={(e) => setBrand(e.target.value)} />}
          </Field>
          <Field label="Modelo (opcional)" error={errors.model}>
            {(p) => <input {...p} className={cls("model")} maxLength={80} value={model} onChange={(e) => setModel(e.target.value)} />}
          </Field>
          <Field label="Calce (opcional)" error={errors.fit}>
            {(p) => (
              <>
                <input {...p} className={cls("fit")} maxLength={80} list="fit-options" value={fit} onChange={(e) => setFit(e.target.value)} />
                <datalist id="fit-options">
                  {FIT_SUGGESTIONS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>
      )}

      <Field label="Fecha" error={errors.date}>
        {(p) => <input {...p} type="date" className={cls("date")} max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>

      <Field label="Notas (opcional)" error={errors.notes}>
        {(p) => <textarea {...p} className={`${cls("notes")} py-2`} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>

      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
