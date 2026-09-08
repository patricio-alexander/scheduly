"use client";

import type { ReactNode } from "react";
/** Fila estilo EdDeli: etiqueta a la izquierda, control a la derecha. */
export function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-separator bg-surface-secondary/20 px-3.5 py-3 transition-colors hover:border-accent/35 hover:bg-accent/5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end sm:min-w-[9rem]">
        {control}
      </div>
    </div>
  );
}

export function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function SettingsSwitch({
  checked,
  onChange,
  disabled,
  lockedLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  lockedLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted">
        {disabled && lockedLabel
          ? lockedLabel
          : checked
            ? "Activado"
            : "Desactivado"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked
            ? "border-accent bg-accent"
            : "border-separator bg-surface-secondary"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "left-auto right-0.5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
