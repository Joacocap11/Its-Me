import type { Attribute, AttributeInput, AttributePatch, AuthStatus, Entry, EntryInput } from "./types";

export interface FieldIssue {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: FieldIssue[] = [],
  ) {
    super(message);
  }

  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const i of this.issues) {
      const field = i.loc.filter((p) => p !== "body").join(".");
      if (field && !(field in out)) out[field] = i.msg.replace(/^Value error, /, "");
    }
    return out;
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (res.ok) return data as T;
  if (res.status === 401 && auth) onUnauthorized();
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (Array.isArray(detail)) {
    const issues = detail as FieldIssue[];
    throw new ApiError(res.status, issues[0]?.msg ?? "Datos inválidos", issues);
  }
  throw new ApiError(res.status, typeof detail === "string" ? detail : "Ocurrió un error inesperado");
}

export const api = {
  status: () => request<AuthStatus>("GET", "/auth/status", undefined, false),
  setup: (username: string, password: string) =>
    request<{ username: string }>("POST", "/auth/setup", { username, password }, false),
  login: (username: string, password: string) =>
    request<{ username: string }>("POST", "/auth/login", { username, password }, false),
  logout: () => request<void>("POST", "/auth/logout"),
  attributes: () => request<Attribute[]>("GET", "/attributes"),
  createAttribute: (b: AttributeInput) => request<Attribute>("POST", "/attributes", b),
  updateAttribute: (id: number, b: AttributePatch) => request<Attribute>("PATCH", `/attributes/${id}`, b),
  deleteAttribute: (id: number) => request<void>("DELETE", `/attributes/${id}`),
  entries: (id: number) => request<Entry[]>("GET", `/attributes/${id}/entries`),
  createEntry: (b: EntryInput) => request<Entry>("POST", "/entries", b),
  updateEntry: (id: number, b: EntryInput) => request<Entry>("PATCH", `/entries/${id}`, b),
  deleteEntry: (id: number) => request<void>("DELETE", `/entries/${id}`),
};
