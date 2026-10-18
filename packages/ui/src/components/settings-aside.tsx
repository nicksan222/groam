import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { shellCardClassName } from '#src/lib/shell-card';

export type SettingsAsideProps = {
  animationDelay?: string;
  children?: ReactNode;
  className?: string;
  description?: string;
  icon: LucideIcon;
  title: string;
};

function SettingsAside({
  animationDelay,
  children,
  className,
  description,
  icon: Icon,
  title
}: SettingsAsideProps) {
  return (
    <aside
      className={shellCardClassName({ className, stack: 'sm', variant: 'panel' })}
      data-slot="settings-aside"
      style={animationDelay ? { animationDelay } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg border border-border text-foreground">
          <Icon className="size-3.5" />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </aside>
  );
}

export { SettingsAside };
