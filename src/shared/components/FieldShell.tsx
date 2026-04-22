import type { ReactNode } from "react";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function FieldShell({ label, error, hint, children }: FieldShellProps) {
  return (
    <label className="field-shell">
      <span className="field-shell__label">{label}</span>
      {children}
      {error ? <span className="field-shell__error">{error}</span> : hint ? <span className="field-shell__hint">{hint}</span> : null}
    </label>
  );
}
