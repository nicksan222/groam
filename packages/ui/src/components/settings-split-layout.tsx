import type { ReactNode } from 'react';

export type SettingsSplitLayoutProps = {
  aside: ReactNode;
  asideWidth?: `${number}rem`;
  children: ReactNode;
};

function SettingsSplitLayout({ aside, children }: SettingsSplitLayoutProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5" data-slot="settings-split-layout">
      {children}
      <div className="w-full min-w-0 space-y-5">{aside}</div>
    </div>
  );
}

export { SettingsSplitLayout };
