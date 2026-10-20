import type { CSSProperties, ReactNode } from 'react';
import { cn } from '#src/lib/utils';

export type SettingsPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function SettingsPanel({ children, className, style }: SettingsPanelProps) {
  return (
    <section
      className={cn(
        'min-w-0 space-y-5 border-b border-border pb-7 last:border-b-0 xl:grid xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-x-6 xl:gap-y-4 xl:space-y-0 xl:[&>*]:col-start-2 xl:[&>[data-slot=settings-panel-heading]]:col-start-1 xl:[&>[data-slot=settings-panel-heading]]:row-start-1',
        className
      )}
      data-slot="settings-panel"
      style={style}
    >
      {children}
    </section>
  );
}

export { SettingsPanel };
