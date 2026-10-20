import { BrandMark } from '@groam/brand/mark';
import type { Icon } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';
import type { ReactNode } from 'react';

export type StatusPageProps = Omit<React.ComponentProps<'section'>, 'title'> & {
  actions?: ReactNode;
  icon: Icon;
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
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6"
      data-slot="status-page"
    >
      <BrandMark className="size-8 shrink-0" decorative />
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
