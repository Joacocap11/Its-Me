import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError, api } from "../api/client";
import type { Attribute, DataType, Region, SizeKind } from "../api/types";
import { DATA_TYPES, SIZE_KINDS } from "../lib/format";
import { REGIONS } from "../lib/regions";
import { Field } from "./ui";

type Errors = Record<string, string>;

interface Props {
  attribute?: Attribute;
  initialRegion?: Region;
  initialType?: DataType;
  onSaved: (attribute: Attribute) => void;
  onCancel: () => void;
}

export function AttributeForm({ attribute, initialRegion, initialType, onSaved, onCancel }: Props) {
  const locked = attribute?.builtin ?? false;
  const [name, setName] = useState(attribute?.name ?? "");
  const [dataType, setDataType] = useState<DataType>(attribute?.data_type ?? initialType ?? "number");
  const [region, setRegion] = useState<Region>(attribute?.region ?? initialRegion ?? "full_body");
  const [unit, setUnit] = useState(attribute?.unit ?? "");
  const [options, setOptions] = useState<string[]>(attribute?.options ?? []);
  const [optionDraft, setOptionDraft] = useState("");
  const [sizeKind, setSizeKind] = useState<SizeKind>(attribute?.size_kind ?? "alpha");
  const [history, setHistory] = useState(attribute?.history_enabled ?? true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const addOption = (draft = optionDraft) => {
    const v = draft.trim();
    if (v && !options.includes(v)) setOptions([...options, v]);
    setOptionDraft("");
  };

  const onOptionKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addOption();
    } else if (e.key === "Backspace" && !optionDraft && options.length) setOptions(options.slice(0, -1));
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const finalOptions = optionDraft.trim() && !options.includes(optionDraft.trim()) ? [...options, optionDraft.trim()] : options;
    const found: Errors = {};
    if (!locked) {
      if (name.trim().length < 2) found.name = "Ingresá un nombre de al menos 2 caracteres";
      if (dataType === "select" && finalOptions.length < 2) found.options = "Agregá al menos 2 opciones";
    }
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const saved = attribute
        ? await api.updateAttribute(
            attribute.id,
            locked
              ? { history_enabled: history }
              : {
                  name: name.trim(),
                  region,
                  unit: dataType === "number" ? unit.trim() || null : null,
                  ...(dataType === "select" ? { options: finalOptions } : {}),
                  history_enabled: history,
                },
          )
        : await api.createAttribute({
            name: name.trim(),
            data_type: dataType,
            region,
            unit: dataType === "number" && unit.trim() ? unit.trim() : null,
            options: dataType === "select" ? finalOptions : null,
            size_kind: dataType === "size" ? sizeKind : null,
            history_enabled: history,
          });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.issues.length) {
        const mapped: Errors = {};
        for (const [loc, msg] of Object.entries(err.fieldErrors())) mapped[loc] = msg;
        setErrors(mapped);
        if (!Object.keys(mapped).length) setFormError(err.message);
      } else setFormError(err instanceof Error ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  };

  const cls = (k: string) => `input ${errors[k] ? "input-error" : ""}`;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {locked && (
        <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Es un atributo predefinido: solo se puede cambiar si guarda historial.
        </p>
      )}

      <Field label="Nombre" error={errors.name}>
        {(p) => <input {...p} className={cls("name")} maxLength={80} disabled={locked} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de dato" hint={attribute ? "No se puede cambiar" : undefined}>
          {(p) => (
            <select {...p} className="input" disabled={!!attribute} value={dataType} onChange={(e) => setDataType(e.target.value as DataType)}>
              {DATA_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Zona del cuerpo" error={errors.region}>
          {(p) => (
            <select {...p} className={cls("region")} disabled={locked} value={region} onChange={(e) => setRegion(e.target.value as Region)}>
              {REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {dataType === "number" && !locked && (
        <Field label="Unidad (opcional)" error={errors.unit}>
          {(p) => <input {...p} className={cls("unit")} maxLength={20} placeholder="cm, kg…" value={unit} onChange={(e) => setUnit(e.target.value)} />}
        </Field>
      )}

      {dataType === "size" && !attribute && (
        <Field label="Tipo de talle">
          {(p) => (
            <select {...p} className="input" value={sizeKind} onChange={(e) => setSizeKind(e.target.value as SizeKind)}>
              {SIZE_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {dataType === "select" && !locked && (
        <Field label="Opciones" error={errors.options} hint="Escribí una opción y presioná Enter">
          {(p) => (
            <div className={`${cls("options")} flex min-h-10 flex-wrap items-center gap-1.5 py-1.5`}>
              {options.map((o) => (
                <span key={o} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                  {o}
                  <button type="button" aria-label={`Quitar ${o}`} onClick={() => setOptions(options.filter((x) => x !== o))}>
                    ×
                  </button>
                </span>
              ))}
              <input
                {...p}
                className="min-w-24 flex-1 bg-transparent text-sm outline-none"
                maxLength={60}
                value={optionDraft}
                onChange={(e) => setOptionDraft(e.target.value)}
                onKeyDown={onOptionKey}
                onBlur={() => addOption()}
              />
            </div>
          )}
        </Field>
      )}

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 accent-indigo-600" checked={history} onChange={(e) => setHistory(e.target.checked)} />
        <span>
          Guardar historial
          <span className="block text-xs text-slate-500">Si lo desactivás, cada valor nuevo reemplaza al anterior.</span>
        </span>
      </label>

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
          {busy ? "Guardando…" : attribute ? "Guardar" : "Crear atributo"}
        </button>
      </div>
    </form>
  );
}
