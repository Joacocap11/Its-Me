import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Attribute } from "../api/types";

interface AttributesValue {
  attributes: Attribute[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const AttributesContext = createContext<AttributesValue | null>(null);

export const useAttributes = (): AttributesValue => {
  const v = useContext(AttributesContext);
  if (!v) throw new Error("AttributesProvider ausente");
  return v;
};

export function AttributesProvider({ children }: { children: ReactNode }) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setAttributes(await api.attributes());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ attributes, loading, error, reload }), [attributes, loading, error, reload]);
  return <AttributesContext.Provider value={value}>{children}</AttributesContext.Provider>;
}
