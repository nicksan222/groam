import type { ReactNode } from 'react';

export function DiffFieldTone({
  children,
  empty,
  side
}: {
  children: ReactNode;
  empty: boolean;
  side: 'after' | 'before';
}) {
  if (empty) {
    return (
      <span className={side === 'before' ? 'text-muted-foreground/70' : 'text-muted-foreground'}>
        {children}
      </span>
    );
  }
  if (side === 'before') {
    return (
      <span className="block whitespace-pre-wrap leading-6 text-muted-foreground">{children}</span>
    );
  }
  return (
    <span className="block whitespace-pre-wrap border-l-2 border-primary/40 pl-2.5 font-medium leading-6 text-foreground">
      {children}
    </span>
  );
}
