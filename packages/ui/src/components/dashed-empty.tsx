import { cn } from '@groam/ui/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type DashedEmptyProps = {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  title?: string;
};

function DashedEmpty({
  action,
  children,
  className,
  icon: Icon,
  iconClassName,
  title
}: DashedEmptyProps) {
  return (
    <div
      className={cn('rounded-xl border border-dashed border-border p-10 text-center', className)}
      data-slot="dashed-empty"
    >
      {Icon ? <Icon className={cn('mx-auto size-8 text-muted-foreground', iconClassName)} /> : null}
      {title ? <p className={cn(Icon && 'mt-3', 'font-medium')}>{title}</p> : null}
      {children ? (
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{children}</p>
      ) : null}
      {action}
    </div>
  );
}

export { DashedEmpty };
