import type { ReactNode } from 'react';

export type SettingsFooterProps = {
  children: ReactNode;
};

function SettingsFooter({ children }: SettingsFooterProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-2 [&>p]:flex-1 [&>p]:basis-48 [&>p]:leading-5"
      data-slot="settings-footer"
    >
      {children}
    </div>
  );
}

export { SettingsFooter };
