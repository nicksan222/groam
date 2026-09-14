import type { CSSProperties, ReactNode } from 'react';

export type SettingsSplitLayoutProps = {
  aside: ReactNode;
  asideWidth?: `${number}rem`;
  children: ReactNode;
};

function SettingsSplitLayout({ aside, asideWidth = '18rem', children }: SettingsSplitLayoutProps) {
  return (
    <div
      className="grid w-full items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,var(--settings-aside-width))]"
      data-slot="settings-split-layout"
      style={{ '--settings-aside-width': asideWidth } as CSSProperties}
    >
      {children}
      <div className="min-w-0 space-y-5">{aside}</div>
    </div>
  );
}

export { SettingsSplitLayout };
