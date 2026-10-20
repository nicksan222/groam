import type { Icon } from '@groam/icons';
import type { ReactNode } from 'react';

export type SettingsPanelHeadingProps = {
  action?: ReactNode;
  description: string;
  icon?: Icon;
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
      <div className="flex min-w-0 items-start gap-2.5 xl:flex-col xl:gap-2.5">
        {Icon ? (
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-muted-foreground">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0 space-y-0.5 pt-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export { SettingsPanelHeading };
