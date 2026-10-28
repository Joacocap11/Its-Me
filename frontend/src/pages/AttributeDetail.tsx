import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Entry } from "../api/types";
import { AttributeForm } from "../components/AttributeForm";
import { EntryModal } from "../components/EntryModal";
import { ChevronLeftIcon, PencilIcon, TrashIcon } from "../components/icons";
import { PrescriptionDates, PrescriptionInfo, PrescriptionSummary } from "../components/PrescriptionView";
import { LineChart } from "../components/LineChart";
import { ConfirmDialog, EmptyState, ErrorState, Modal, Spinner } from "../components/ui";
import { formatDate, formatValue, sizeContextKey, sizeContextLabel, sizeSubtitle } from "../lib/format";
import { regionLabel } from "../lib/regions";
import { useAttributes } from "../state/attributes";
import { useToast } from "../state/toast";

type Dialog =
  | { kind: "add" }
  | { kind: "edit"; entry: Entry }
  | { kind: "delete"; entry: Entry }
  | { kind: "editAttribute" }
  | { kind: "deleteAttribute" }
  | null;

export function AttributeDetail() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const ctx = params.get("ctx");
  const { attributes, loading, error, reload } = useAttributes();
  const attribute = attributes.find((a) => a.id === id);

  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setEntries(await api.entries(id));
      setEntriesError(null);
    } catch (e) {
      setEntriesError(e instanceof Error ? e.message : "Error al cargar el historial");
    }
  }, [id]);

  useEffect(() => {
    setEntries(null);
    void loadEntries();
  }, [loadEntries]);

  const refresh = () => Promise.all([loadEntries(), reload()]);

  const remove = async (action: () => Promise<void>, message: string, after?: () => void) => {
    setBusy(true);
    try {
      await action();
      setDialog(null);
      toast(message);
      after?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!Number.isInteger(id)) return <Navigate to="/" replace />;
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  if (!attribute)
    return (
      <EmptyState title="No se encontró el atributo">
        <Link className="btn-primary" to="/">
          Volver al inicio
        </Link>
      </EmptyState>
    );

  const latest = attribute.latest_entry;
  const isSize = attribute.data_type === "size";
  const isRx = attribute.data_type === "prescription";
  const shown = entries && isSize && ctx ? entries.filter((e) => sizeContextKey(e) === ctx) : entries;
  const chartPoints =
    attribute.data_type === "number" && entries
      ? (shown ?? []).flatMap((e) => (e.value_number === null ? [] : [{ date: e.measured_on, value: e.value_number }]))
      : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={attribute.data_type === "size" ? "/talles" : "/"} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ChevronLeftIcon /> Volver
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{attribute.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {regionLabel(attribute.region)}
            {attribute.builtin ? " · Predefinido" : ""}
            {attribute.history_enabled ? "" : " · Sin historial"}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setDialog({ kind: "editAttribute" })}>
            <PencilIcon /> Editar
          </button>
          {!attribute.builtin && (
            <button className="btn-secondary btn-sm text-red-600 dark:text-red-400" onClick={() => setDialog({ kind: "deleteAttribute" })}>
              <TrashIcon /> Eliminar
            </button>
          )}
        </div>
      </div>

      {isRx ? (
        <section className="card space-y-3 p-4" aria-label="Graduación actual">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Graduación actual</p>
            <button className="btn-primary btn-sm" onClick={() => setDialog({ kind: "add" })}>
              Nueva receta
            </button>
          </div>
          {latest ? (
            <>
              <PrescriptionSummary entry={latest} />
              <PrescriptionDates entry={latest} />
            </>
          ) : (
            <p className="text-lg text-slate-400">Sin datos</p>
          )}
          <PrescriptionInfo />
        </section>
      ) : (
      <section className="card flex items-center justify-between gap-4 p-5" aria-label="Valor actual">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">Valor actual</p>
          {latest ? (
            <>
              <p className="text-4xl font-bold tracking-tight">{formatValue(attribute, latest)}</p>
              <p className="mt-1 truncate text-sm text-slate-500">
                {formatDate(latest.measured_on)}
                {attribute.data_type === "size" && sizeSubtitle(latest) ? ` · ${sizeSubtitle(latest)}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-lg text-slate-400">Sin datos</p>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setDialog({ kind: "add" })}>
          Agregar valor
        </button>
      </section>
      )}

      {chartPoints.length >= 2 && (
        <section className="card p-4" aria-label="Evolución">
          <LineChart points={chartPoints} unit={attribute.unit} />
        </section>
      )}

      {isSize && attribute.current_entries.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar historial por sistema">
          <button className="chip" aria-pressed={!ctx} onClick={() => setParams({}, { replace: true })}>
            Todos
          </button>
          {attribute.current_entries.map((e) => (
            <button key={e.id} className="chip" aria-pressed={ctx === sizeContextKey(e)} onClick={() => setParams({ ctx: sizeContextKey(e) }, { replace: true })}>
              {sizeContextLabel(e)}
            </button>
          ))}
        </div>
      )}

      <section aria-label="Historial">
        <h2 className="mb-2 text-lg font-semibold">Historial</h2>
        {entriesError ? (
          <ErrorState message={entriesError} onRetry={() => void loadEntries()} />
        ) : entries === null ? (
          <Spinner />
        ) : (shown ?? []).length === 0 ? (
          <EmptyState title="Todavía no hay registros" hint="Agregá el primer valor para empezar el historial." />
        ) : (
          <ul className="card divide-y divide-slate-200 dark:divide-slate-800">
            {(shown ?? []).map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  {isRx ? (
                    <div className="space-y-2">
                      <PrescriptionDates entry={e} />
                      <PrescriptionSummary entry={e} />
                    </div>
                  ) : (
                    <p className="font-medium">{formatValue(attribute, e)}</p>
                  )}
                  {!isRx && (
                    <p className="text-xs text-slate-500">
                      {formatDate(e.measured_on)}
                      {attribute.data_type === "size" && sizeSubtitle(e) ? ` · ${sizeSubtitle(e)}` : ""}
                    </p>
                  )}
                  {e.notes && <p className="mt-0.5 break-words text-sm text-slate-600 dark:text-slate-300">{e.notes}</p>}
                </div>
                <button className="btn-ghost size-9 !min-h-0 !p-0" aria-label={`Editar registro del ${formatDate(e.measured_on)}`} onClick={() => setDialog({ kind: "edit", entry: e })}>
                  <PencilIcon />
                </button>
                <button className="btn-ghost size-9 !min-h-0 !p-0 text-red-600 dark:text-red-400" aria-label={`Eliminar registro del ${formatDate(e.measured_on)}`} onClick={() => setDialog({ kind: "delete", entry: e })}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <EntryModal
          attribute={attribute}
          entry={dialog.kind === "edit" ? dialog.entry : undefined}
          seedEntry={ctx ? attribute.current_entries.find((e) => sizeContextKey(e) === ctx) : undefined}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            toast("Valor guardado");
            void refresh();
          }}
        />
      )}

      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Eliminar registro"
          message={`Se eliminará el registro del ${formatDate(dialog.entry.measured_on)}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void remove(() => api.deleteEntry(dialog.entry.id), "Registro eliminado", () => void refresh())}
        />
      )}

      {dialog?.kind === "editAttribute" && (
        <Modal title="Editar atributo" onClose={() => setDialog(null)}>
          <AttributeForm
            attribute={attribute}
            onCancel={() => setDialog(null)}
            onSaved={() => {
              setDialog(null);
              toast("Atributo actualizado");
              void reload();
            }}
          />
        </Modal>
      )}

      {dialog?.kind === "deleteAttribute" && (
        <ConfirmDialog
          title="Eliminar atributo"
          message={`Se eliminará “${attribute.name}” junto con sus ${attribute.entry_count} registros. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void remove(() => api.deleteAttribute(attribute.id), "Atributo eliminado", () => {
              navigate("/", { replace: true });
              void reload();
            })
          }
        />
      )}
    </div>
  );
}
