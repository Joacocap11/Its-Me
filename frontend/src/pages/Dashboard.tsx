import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Attribute, Region } from "../api/types";
import { AttributeRow } from "../components/AttributeRow";
import { EntryModal } from "../components/EntryModal";
import { CloseIcon, SearchIcon } from "../components/icons";
import { Silhouette } from "../components/Silhouette";
import { EmptyState, ErrorState, Spinner } from "../components/ui";
import { regionsInView, type BodyView } from "../lib/body";
import { attributesInRegion, matchesQuery, regionLabel, regionsWithData, REGIONS } from "../lib/regions";
import { useAttributes } from "../state/attributes";
import { useToast } from "../state/toast";

type Selection = Region | "sizes" | "measures" | null;

export function Dashboard() {
  const { attributes, loading, error, reload } = useAttributes();
  const toast = useToast();
  const [view, setView] = useState<BodyView>("front");
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<Attribute | null>(null);

  const withData = useMemo(() => regionsWithData(attributes), [attributes]);
  const region = REGIONS.some((r) => r.key === selection) ? (selection as Region) : null;
  const searching = query.trim().length > 0;

  const list = useMemo(() => {
    if (searching) return attributes.filter((a) => matchesQuery(a.name, query));
    if (selection === "sizes") return attributes.filter((a) => a.data_type === "size");
    if (selection === "measures") return attributes.filter((a) => a.data_type === "number");
    return region ? attributesInRegion(attributes, region) : [];
  }, [attributes, query, searching, selection, region]);

  const changeView = (v: BodyView) => {
    setView(v);
    if (region && !regionsInView(v).has(region)) setSelection(null);
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  const heading = searching
    ? `Resultados para “${query.trim()}”`
    : selection === "sizes"
      ? "Talles"
      : selection === "measures"
        ? "Medidas"
        : region
          ? regionLabel(region)
          : "";
  const showList = searching || selection !== null;
  const newAttributeLink = region ? `/atributos/nuevo?region=${region}` : "/atributos/nuevo";

  return (
    <div className="space-y-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
        <input
          type="search"
          className="input pl-10"
          placeholder="Buscar atributo…"
          aria-label="Buscar atributo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Categorías">
        <button className="chip" aria-pressed={selection === null && !searching} onClick={() => { setSelection(null); setQuery(""); }}>
          Todo
        </button>
        <button className="chip" aria-pressed={selection === "sizes"} onClick={() => { setSelection("sizes"); setQuery(""); }}>
          Talles
        </button>
        <button className="chip" aria-pressed={selection === "measures"} onClick={() => { setSelection("measures"); setQuery(""); }}>
          Medidas
        </button>
        {REGIONS.map((r) => (
          <button key={r.key} className="chip" aria-pressed={selection === r.key} onClick={() => { setSelection(r.key); setQuery(""); }}>
            {r.label}
            {withData.has(r.key) && <span className="ml-1.5 size-1.5 rounded-full bg-emerald-500" aria-label="con datos" />}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Mapa corporal" className="card flex flex-col items-center gap-3 p-4">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Vista">
            {(["front", "back"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => changeView(v)}
                className="rounded-lg px-4 py-1.5 text-sm font-medium aria-pressed:bg-white aria-pressed:shadow-sm dark:aria-pressed:bg-slate-700"
              >
                {v === "front" ? "Frente" : "Espalda"}
              </button>
            ))}
          </div>
          <Silhouette view={view} selected={region} withData={withData} onSelect={setSelection} />
          <button className="chip" aria-pressed={selection === "full_body"} onClick={() => setSelection("full_body")}>
            Cuerpo completo
            {withData.has("full_body") && <span className="ml-1.5 size-1.5 rounded-full bg-emerald-500" aria-label="con datos" />}
          </button>
        </section>

        {showList && (
          <>
            <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => { setSelection(null); setQuery(""); }} aria-hidden="true" />
            <aside
              aria-label={heading}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[55dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-slate-50 p-4 pb-24 shadow-2xl lg:static lg:z-auto lg:max-h-none lg:self-start lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:shadow-none dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{heading}</h2>
                <button className="btn-ghost size-9 !min-h-0 !p-0" aria-label="Cerrar panel" onClick={() => { setSelection(null); setQuery(""); }}>
                  <CloseIcon />
                </button>
              </div>
              {list.length ? (
                <ul className="space-y-2">
                  {list.map((a) => (
                    <AttributeRow key={a.id} attribute={a} showRegion={region === null} onAdd={setAdding} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={searching ? "Sin resultados" : "No hay atributos en esta zona"}
                  hint={searching ? "Probá con otro nombre." : "Podés crear uno propio."}
                />
              )}
              {!searching && (
                <Link className="btn-secondary mt-3 w-full" to={newAttributeLink}>
                  Nuevo atributo{region ? ` en ${regionLabel(region).toLowerCase()}` : ""}
                </Link>
              )}
            </aside>
          </>
        )}
        {!showList && (
          <div className="hidden lg:block">
            <EmptyState title="Elegí una zona del cuerpo" hint="Tocá una parte de la figura o usá las categorías para ver tus valores." />
          </div>
        )}
      </div>

      {adding && (
        <EntryModal
          attribute={adding}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            toast("Valor guardado");
            void reload();
          }}
        />
      )}
    </div>
  );
}
