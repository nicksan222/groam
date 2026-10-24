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
        'min-w-0 [--settings-label:12rem] space-y-6 border-b border-border py-6 lg:flow-root lg:[&>*]:ml-[var(--settings-label)] lg:[&>*]:pl-6 lg:[&>:nth-child(2)]:mt-0 lg:[&>[data-slot=settings-panel-heading]]:sticky lg:[&>[data-slot=settings-panel-heading]]:top-6 lg:[&>[data-slot=settings-panel-heading]]:float-left lg:[&>[data-slot=settings-panel-heading]]:mb-0 lg:[&>[data-slot=settings-panel-heading]]:ml-0 lg:[&>[data-slot=settings-panel-heading]]:w-[var(--settings-label)] lg:[&>[data-slot=settings-panel-heading]]:pr-6 lg:[&>[data-slot=settings-panel-heading]]:pl-0',
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
