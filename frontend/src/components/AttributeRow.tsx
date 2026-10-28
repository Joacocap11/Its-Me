import { Link } from "react-router-dom";
import type { Attribute } from "../api/types";
import { formatDate, formatValue, sizeSubtitle } from "../lib/format";
import { regionLabel } from "../lib/regions";

interface Props {
  attribute: Attribute;
  showRegion?: boolean;
  onAdd: (attribute: Attribute) => void;
}

export function AttributeRow({ attribute, showRegion, onAdd }: Props) {
  const e = attribute.latest_entry;
  const subtitle = e && attribute.data_type === "size" ? sizeSubtitle(e) : "";
  return (
    <li className="card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{attribute.name}</p>
          {showRegion && <p className="text-xs text-slate-500">{regionLabel(attribute.region)}</p>}
        </div>
        <div className="text-right">
          {e ? (
            <>
              <p className="text-lg font-semibold leading-tight">{formatValue(attribute, e)}</p>
              <p className="text-xs text-slate-500">{formatDate(e.measured_on)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Sin datos</p>
          )}
        </div>
      </div>
      {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3 flex gap-2">
        <button className="btn-primary btn-sm" onClick={() => onAdd(attribute)}>
          Agregar valor
        </button>
        <Link className="btn-secondary btn-sm" to={`/atributos/${attribute.id}`}>
          Historial
        </Link>
      </div>
    </li>
  );
}
