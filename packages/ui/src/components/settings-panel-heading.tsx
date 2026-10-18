import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type SettingsPanelHeadingProps = {
  action?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
};

function SettingsPanelHeading({
  action,
  description,
  icon: Icon,
  title
}: SettingsPanelHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-3" data-slot="settings-panel-heading">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border text-foreground">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 space-y-0.5 pt-0.5">
          <h2 className="text-sm font-semibold tracking-tight sm:text-base">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export { SettingsPanelHeading };
