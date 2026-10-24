import type { ReactNode } from 'react';

export type SettingsSplitLayoutProps = {
  aside: ReactNode;
  asideWidth?: `${number}rem`;
  children: ReactNode;
};

function SettingsSplitLayout({ aside, children }: SettingsSplitLayoutProps) {
  return (
    <div className="flex w-full min-w-0 flex-col" data-slot="settings-split-layout">
      {children}
      <div className="w-full min-w-0 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6 lg:col-start-2 lg:pl-6">{aside}</div>
      </div>
    </div>
  );
}

export { SettingsSplitLayout };
