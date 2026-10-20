import type { Icon } from '@groam/icons';
import type { ReactNode } from 'react';
import { cn } from '#src/lib/utils';

export type SettingsAsideProps = {
  animationDelay?: string;
  children?: ReactNode;
  className?: string;
  description?: string;
  icon: Icon;
  title: string;
};

function SettingsAside({
  children,
  className,
  description,
  icon: Icon,
  title
}: SettingsAsideProps) {
  return (
    <aside
      className={cn('space-y-2 px-1 text-muted-foreground', className)}
      data-slot="settings-aside"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-4 shrink-0 place-items-center">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </aside>
  );
}

export { SettingsAside };
