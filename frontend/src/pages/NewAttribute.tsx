import { useNavigate, useSearchParams } from "react-router-dom";
import type { DataType, Region } from "../api/types";
import { AttributeForm } from "../components/AttributeForm";
import { DATA_TYPES } from "../lib/format";
import { REGIONS } from "../lib/regions";
import { useAttributes } from "../state/attributes";
import { useToast } from "../state/toast";

export function NewAttribute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { reload } = useAttributes();
  const region = REGIONS.find((r) => r.key === params.get("region"))?.key as Region | undefined;
  const type = DATA_TYPES.find((t) => t.key === params.get("type"))?.key as DataType | undefined;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Nuevo atributo</h1>
      <div className="card p-5">
        <AttributeForm
          initialRegion={region}
          initialType={type}
          onCancel={() => navigate(-1)}
          onSaved={async (a) => {
            await reload();
            toast("Atributo creado");
            navigate(`/atributos/${a.id}`, { replace: true });
          }}
        />
      </div>
    </div>
  );
}
