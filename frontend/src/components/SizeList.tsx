import { Link } from "react-router-dom";
import type { Attribute, Entry } from "../api/types";
import { formatDate, formatSize, sizeContextKey, sizeSubtitle, systemName } from "../lib/format";

interface Props {
  attribute: Attribute;
  onAdd: (attribute: Attribute, seed: Entry) => void;
}

export function SizeList({ attribute, onAdd }: Props) {
  const entries = attribute.current_entries;
  if (entries.length === 0) return null;
  return (
    <details className="group mt-3 rounded-xl border border-slate-200 dark:border-slate-800">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Ver todos mis talles ({entries.length})
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {entries.map((e) => (
          <li key={e.id} className="space-y-1 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{systemName(e)}</span>
              <span className="text-xs text-slate-500">{formatDate(e.measured_on)}</span>
            </div>
            <p className="text-xl font-semibold leading-tight">{formatSize(e)}</p>
            {sizeSubtitle(e) && <p className="truncate text-xs text-slate-500">{sizeSubtitle(e)}</p>}
            {e.notes && <p className="break-words text-xs text-slate-500">{e.notes}</p>}
            <div className="flex gap-2 pt-1">
              <Link className="btn-secondary btn-sm" to={`/atributos/${attribute.id}?ctx=${encodeURIComponent(sizeContextKey(e))}`}>
                Historial
              </Link>
              <button className="btn-ghost btn-sm" onClick={() => onAdd(attribute, e)}>
                + Nuevo valor
              </button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
