import { cn } from '@groam/ui/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import type { ReactNode } from 'react';

export type StatusPageProps = Omit<React.ComponentProps<'section'>, 'title'> & {
  actions?: ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
};

function StatusPage({
  actions,
  children,
  className,
  icon: Icon,
  iconClassName,
  title,
  ...props
}: StatusPageProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6" data-slot="status-page">
      <section
        className={cn('w-full max-w-md rounded-xl border border-border p-6 text-center', className)}
        {...props}
      >
        <Icon className={cn('mx-auto size-9', iconClassName)} />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        {children ? <p className="mt-2 text-sm text-muted-foreground">{children}</p> : null}
        {actions ? <div className="mt-5 flex justify-center gap-2">{actions}</div> : null}
      </section>
    </main>
  );
}

export { StatusPage };
