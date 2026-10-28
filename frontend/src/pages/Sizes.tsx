import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Attribute, Entry } from "../api/types";
import { SizeList } from "../components/SizeList";
import { EntryModal } from "../components/EntryModal";
import { SearchIcon } from "../components/icons";
import { EmptyState, ErrorState, Spinner } from "../components/ui";
import { formatDate, formatValue, sizeSubtitle } from "../lib/format";
import { matchesQuery, regionLabel } from "../lib/regions";
import { useAttributes } from "../state/attributes";
import { useToast } from "../state/toast";

export function Sizes() {
  const { attributes, loading, error, reload } = useAttributes();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<{ attribute: Attribute; seed?: Entry } | null>(null);

  const sizes = useMemo(() => attributes.filter((a) => a.data_type === "size"), [attributes]);
  const visible = useMemo(() => (query.trim() ? sizes.filter((a) => matchesQuery(a.name, query)) : sizes), [sizes, query]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Mis talles</h1>
        <Link className="btn-secondary btn-sm" to="/atributos/nuevo?type=size">
          Nuevo talle
        </Link>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
        <input
          type="search"
          className="input pl-10"
          placeholder="Buscar talle…"
          aria-label="Buscar talle"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={sizes.length ? "Sin resultados" : "Todavía no hay talles"}
          hint={sizes.length ? "Probá con otro nombre." : "Creá un talle para empezar a registrarlo."}
        >
          {!sizes.length && (
            <Link className="btn-primary" to="/atributos/nuevo?type=size">
              Nuevo talle
            </Link>
          )}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((a) => {
            const e = a.latest_entry;
            return (
              <li key={a.id} className="card relative flex flex-col has-[details[open]]:col-span-full">
                <Link to={`/atributos/${a.id}`} className="flex flex-1 flex-col gap-0.5 rounded-2xl p-3 pb-2 focus-visible:outline-2 focus-visible:outline-indigo-500">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  <span className="truncate text-xs text-slate-500">{regionLabel(a.region)}</span>
                  <span className={`mt-2 text-3xl font-bold tracking-tight ${e ? "" : "text-slate-300 dark:text-slate-700"}`}>
                    {e ? formatValue(a, e) : "—"}
                  </span>
                  <span className="min-h-4 truncate text-xs text-slate-500">{e ? sizeSubtitle(e) : ""}</span>
                  <span className="min-h-4 text-[11px] text-slate-400">{e ? formatDate(e.measured_on) : "Sin datos"}</span>
                </Link>
                <div className="px-2 pb-2">
                  <SizeList attribute={a} onAdd={(attribute, seed) => setAdding({ attribute, seed })} />
                  <button className="btn-ghost btn-sm mt-1" onClick={() => setAdding({ attribute: a })}>
                    + Agregar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <EntryModal
          attribute={adding.attribute}
          seedEntry={adding.seed}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            toast("Talle guardado");
            void reload();
          }}
        />
      )}
    </div>
  );
}
