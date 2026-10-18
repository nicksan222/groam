import type { ReactNode } from 'react';

export type SettingsStackProps = {
  children: ReactNode;
};

function SettingsStack({ children }: SettingsStackProps) {
  return (
    <div className="w-full space-y-5" data-slot="settings-stack">
      {children}
    </div>
  );
}

export { SettingsStack };
