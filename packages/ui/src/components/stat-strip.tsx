import { IconTile } from '@groam/ui/components/icon-tile';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '#src/lib/utils';

const columnClass = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4'
} as const;

export type StatStripProps = React.ComponentProps<'section'> & {
  columns?: keyof typeof columnClass;
};

function StatStripRoot({ children, className, columns = 3, ...props }: StatStripProps) {
  return (
    <section
      className={cn('grid overflow-hidden rounded-lg border', columnClass[columns], className)}
      {...props}
    >
      {children}
    </section>
  );
}

export type StatStripItemProps = {
  attention?: boolean;
  className?: string;
  icon?: LucideIcon;
  label: string;
  value: number | string;
};

function StatStripItem({
  attention = false,
  className,
  icon: Icon,
  label,
  value
}: StatStripItemProps) {
  const content = (
    <>
      <p className="text-2xl font-medium leading-6 tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </>
  );

  return (
    <div
      className={cn(
        'border-b last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0',
        Icon ? 'flex items-center gap-4 p-5' : 'p-4',
        className
      )}
    >
      {Icon ? (
        <>
          <IconTile variant={attention ? 'destructive' : 'muted'}>
            <Icon className="size-4" />
          </IconTile>
          <div>{content}</div>
        </>
      ) : (
        content
      )}
    </div>
  );
}

const StatStrip = Object.assign(StatStripRoot, {
  Item: StatStripItem
});

export { StatStrip };
