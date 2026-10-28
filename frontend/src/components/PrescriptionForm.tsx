import { useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import type { Attribute, Entry, Eye } from "../api/types";
import { todayISO } from "../lib/format";
import {
  buildEye,
  CONDITIONS,
  emptyEyeForm,
  EYES,
  eyeToForm,
  isEyeFormEmpty,
  validateEye,
  type EyeForm,
} from "../lib/prescription";
import { PrescriptionInfo } from "./PrescriptionView";
import { Field } from "./ui";

interface Props {
  attribute: Attribute;
  entry?: Entry;
  onSaved: (entry: Entry) => void;
  onCancel: () => void;
}

type Errors = Record<string, string>;
const MEASURES = [
  { key: "sph", label: "SPH · Esfera" },
  { key: "cyl", label: "CYL · Cilindro" },
  { key: "axis", label: "AXIS · Eje (0–180)" },
  { key: "add", label: "ADD · Adición" },
] as const;

export function PrescriptionForm({ attribute, entry, onSaved, onCancel }: Props) {
  const [eyes, setEyes] = useState<Record<Eye, EyeForm>>({
    od: entry ? eyeToForm(entry.details?.od) : emptyEyeForm(),
    oi: entry ? eyeToForm(entry.details?.oi) : emptyEyeForm(),
  });
  const [date, setDate] = useState(entry?.measured_on ?? todayISO());
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (eye: Eye, change: Partial<EyeForm>) => setEyes((s) => ({ ...s, [eye]: { ...s[eye], ...change } }));

  const validate = (): Errors => {
    const found: Errors = {};
    if (!date) found.date = "Ingresá la fecha de la receta";
    else if (date > todayISO()) found.date = "La fecha no puede ser futura";
    for (const { key } of EYES) for (const [field, msg] of Object.entries(validateEye(eyes[key]))) found[`${key}.${field}`] = msg;
    if (EYES.every(({ key }) => isEyeFormEmpty(eyes[key]))) found.form = "Ingresá la graduación de al menos un ojo";
    return found;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = {
        measured_on: date,
        notes: notes.trim() || null,
        details: { od: buildEye(eyes.od), oi: buildEye(eyes.oi) },
        ...(entry ? {} : { attribute_id: attribute.id }),
      };
      onSaved(entry ? await api.updateEntry(entry.id, body) : await api.createEntry(body));
    } catch (err) {
      setFormError(err instanceof ApiError && err.issues.length ? Object.values(err.fieldErrors()).join(". ") : err instanceof Error ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  };

  const cls = (k: string) => `input ${errors[k] ? "input-error" : ""}`;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <PrescriptionInfo />

      {EYES.map(({ key, short, label }) => (
        <fieldset key={key} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <legend className="px-1 text-sm font-semibold">
            {short} · {label}
          </legend>
          <Field label="Condición (opcional)">
            {(p) => (
              <select {...p} className="input" value={eyes[key].condition} onChange={(e) => patch(key, { condition: e.target.value as EyeForm["condition"] })}>
                <option value="">Sin indicar</option>
                {CONDITIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {MEASURES.map(({ key: field, label: fieldLabel }) => (
              <Field key={field} label={`${fieldLabel}${field === "add" ? " (opc.)" : ""}`} error={errors[`${key}.${field}`]}>
                {(p) => (
                  <input
                    {...p}
                    className={cls(`${key}.${field}`)}
                    inputMode={field === "axis" ? "numeric" : "text"}
                    autoComplete="off"
                    placeholder={field === "axis" ? "Ej.: 90" : "Ej.: -2,25"}
                    value={eyes[key][field]}
                    onChange={(e) => patch(key, { [field]: e.target.value })}
                  />
                )}
              </Field>
            ))}
          </div>
          <Field label="Observaciones (opcional)">
            {(p) => <input {...p} className="input" maxLength={500} value={eyes[key].notes} onChange={(e) => patch(key, { notes: e.target.value })} />}
          </Field>
        </fieldset>
      ))}

      <Field label="Fecha de la receta" error={errors.date}>
        {(p) => <input {...p} type="date" className={cls("date")} max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>

      <Field label="Notas de la receta (opcional)">
        {(p) => <textarea {...p} className="input py-2" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>

      {(errors.form || formError) && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errors.form ?? formError}
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
