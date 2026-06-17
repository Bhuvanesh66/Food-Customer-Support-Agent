import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export function HoloCard({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={clsx('glass rounded-2xl p-5', className)}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{title}</h3>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
