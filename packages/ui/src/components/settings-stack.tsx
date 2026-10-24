import type { ReactNode } from 'react';

export type SettingsStackProps = {
  children: ReactNode;
};

function SettingsStack({ children }: SettingsStackProps) {
  return (
    <div className="flex w-full flex-col" data-slot="settings-stack">
      {children}
    </div>
  );
}

export { SettingsStack };
