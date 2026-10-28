import type { Entry } from "../api/types";
import { formatDate } from "../lib/format";
import { ABBREVIATIONS, conditionLabel, EYES, eyeMeasures } from "../lib/prescription";

export function PrescriptionSummary({ entry }: { entry: Entry }) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
      {EYES.map(({ key, short, label }) => {
        const eye = entry.details?.[key];
        const measures = eye ? eyeMeasures(eye) : [];
        return (
          <section key={key} aria-label={label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <h3 className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold tracking-tight">{short}</span>
              <span className="text-xs text-slate-500">{label}</span>
            </h3>
            {eye ? (
              <>
                {eye.condition && <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">{conditionLabel(eye.condition)}</p>}
                {measures.length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    {measures.map((m) => (
                      <div key={m.label} className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs text-slate-500">{m.label}</dt>
                        <dd className="font-semibold tabular-nums">{m.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {eye.notes && <p className="mt-2 break-words text-xs text-slate-500">{eye.notes}</p>}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Sin datos</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function PrescriptionInfo() {
  return (
    <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
        ¿Qué significan SPH, CYL, AXIS y ADD?
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <dl className="space-y-1.5 border-t border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        {ABBREVIATIONS.map((a) => (
          <div key={a.term}>
            <dt className="inline font-semibold">{a.term}: </dt>
            <dd className="inline">{a.meaning}</dd>
          </div>
        ))}
        <p className="pt-1 text-slate-500">La app solo guarda lo que figura en tu receta; no interpreta ni diagnostica.</p>
      </dl>
    </details>
  );
}

export const PrescriptionDates = ({ entry }: { entry: Entry }) => (
  <p className="text-xs text-slate-500">
    Receta del {formatDate(entry.measured_on)} · registrada el {formatDate(entry.created_at)}
  </p>
);
