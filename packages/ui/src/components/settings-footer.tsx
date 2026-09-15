import type { ReactNode } from 'react';

export type SettingsFooterProps = {
  children: ReactNode;
};

function SettingsFooter({ children }: SettingsFooterProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border/35 pt-4"
      data-slot="settings-footer"
    >
      {children}
    </div>
  );
}

export { SettingsFooter };
