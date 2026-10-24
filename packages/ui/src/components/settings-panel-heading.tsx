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
      <div className="min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          {Icon ? (
            <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          ) : null}
          <h2 className="text-base leading-6 font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export { SettingsPanelHeading };
