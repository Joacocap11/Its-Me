import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

export const Spinner = ({ label = "Cargando…" }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
    <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
    <span className="text-sm">{label}</span>
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="card mx-auto max-w-md p-6 text-center" role="alert">
    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
    {onRetry && (
      <button className="btn-secondary mt-4" onClick={onRetry}>
        Reintentar
      </button>
    )}
  </div>
);

export const EmptyState = ({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
    <p className="font-medium">{title}</p>
    {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    {children && <div className="mt-4 flex justify-center">{children}</div>}
  </div>
);

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error || hint ? msgId : undefined })}
      {(error || hint) && (
        <p id={msgId} className={`mt-1 text-xs ${error ? "text-red-600 dark:text-red-400" : "text-slate-500"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not([data-close])")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button data-close className="btn-ghost -mr-2 -mt-1 size-9 !min-h-0 !p-0" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
