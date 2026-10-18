import type { CSSProperties, ReactNode } from 'react';
import { shellCardClassName } from '#src/lib/shell-card';

export type SettingsPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function SettingsPanel({ children, className, style }: SettingsPanelProps) {
  return (
    <section
      className={shellCardClassName({ className, stack: 'lg', variant: 'panel' })}
      data-slot="settings-panel"
      style={style}
    >
      {children}
    </section>
  );
}

export { SettingsPanel };
