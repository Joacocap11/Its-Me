import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api } from "../api/client";
import { ThemeButton } from "../components/Layout";
import { Field } from "../components/ui";
import { useAuth } from "../state/auth";

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="absolute right-3 top-3">
        <ThemeButton />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">It's Me</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="card mt-6 p-5">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function useCredentialsForm(action: (u: string, p: string) => Promise<{ username: string }>) {
  const { enter } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const run = async (username: string, password: string, validate?: () => Record<string, string>) => {
    const found = validate?.() ?? {};
    setFields(found);
    setError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      enter((await action(username, password)).username);
    } catch (e) {
      if (e instanceof ApiError && e.issues.length) {
        const mapped = e.fieldErrors();
        setFields(mapped);
        if (!Object.keys(mapped).length) setError(e.message);
      } else setError(e instanceof Error ? e.message : "Error inesperado");
      setBusy(false);
    }
  };
  return { busy, error, fields, run };
}

export function SetupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, fields, run } = useCredentialsForm(api.setup);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(username.trim(), password, () => {
      const f: Record<string, string> = {};
      if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username.trim())) f.username = "3 a 40 caracteres: letras, números, punto, guion o guion bajo";
      if (password.length < 10) f.password = "Mínimo 10 caracteres";
      else if (password.length > 128) f.password = "Máximo 128 caracteres";
      if (confirm !== password) f.confirm = "Las contraseñas no coinciden";
      return f;
    });
  };

  return (
    <AuthShell title="Configuración inicial" subtitle="Creá tu usuario para empezar. Solo se hace una vez.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Usuario" error={fields.username}>
          {(p) => <input {...p} className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />}
        </Field>
        <Field label="Contraseña" error={fields.password} hint="Mínimo 10 caracteres">
          {(p) => <input {...p} type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Repetir contraseña" error={fields.confirm}>
          {(p) => <input {...p} type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creando…" : "Crear usuario"}
        </button>
      </form>
    </AuthShell>
  );
}

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useCredentialsForm(api.login);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(username.trim(), password);
  };

  return (
    <AuthShell title="Iniciar sesión" subtitle="Tus medidas y talles, siempre a mano.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Usuario">
          {(p) => <input {...p} className="input" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />}
        </Field>
        <Field label="Contraseña">
          {(p) => <input {...p} type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </AuthShell>
  );
}
