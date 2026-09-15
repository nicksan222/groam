import { cn } from '@groam/ui/lib/utils';
import React from 'react';
import type { TabItemProps } from '#src/components/shell/types';

const ChipIcon: React.FC<{ icon: TabItemProps['icon'] }> = ({ icon }) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
      className: 'h-3 w-3 shrink-0'
    });
  }
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon)
  ) {
    return React.createElement(icon as React.ComponentType<{ size?: number; className?: string }>, {
      size: 16,
      className: 'h-3 w-3 shrink-0'
    });
  }
  return null;
};

function getChipClasses(disabled: boolean | undefined, isActive: boolean | undefined): string {
  return cn(
    'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors',
    disabled
      ? 'cursor-not-allowed opacity-50 text-muted-foreground'
      : isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-muted/50'
  );
}

function SidebarMobileChip({ tab }: { tab: React.ReactElement<TabItemProps> }) {
  const { icon, title, href, isActive, onClick, disabled } = tab.props;
  const chipClasses = getChipClasses(disabled, isActive);
  const chipContent = (
    <>
      <ChipIcon icon={icon} />
      {title}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} className={chipClasses} onClick={onClick}>
        {chipContent}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={chipClasses}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {chipContent}
    </button>
  );
}

export const SidebarMobileNav: React.FC<{
  tabs: React.ReactElement<TabItemProps>[];
  header?: React.ReactNode;
  'data-testid'?: string;
}> = ({ tabs, header, 'data-testid': dataTestId }) => (
  <div className="border-b md:hidden" data-testid={dataTestId ? `${dataTestId}-mobile` : undefined}>
    {header && <div className="border-b px-3 py-2">{header}</div>}
    <div className="flex overflow-x-auto gap-0.5 px-2 py-1.5">
      {tabs.map((tab) => (
        <SidebarMobileChip key={tab.key ?? tab.props.href ?? tab.props.title} tab={tab} />
      ))}
    </div>
  </div>
);
