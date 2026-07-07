import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-line-soft pb-6 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-mute">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-ink-mute">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}