'use client';

import PulsingDot from '@groam/ui/components/pulsing-dot';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@groam/ui/components/tooltip';
import { cn } from '@groam/ui/lib/utils';
import React, { useCallback } from 'react';
import type { TabItemProps } from '#src/components/shell/types';

function isIconComponent(icon: unknown): boolean {
  if (typeof icon === 'function') return true;
  return typeof icon === 'object' && icon !== null && '$$typeof' in icon;
}

function TabIcon({
  activeClass,
  icon,
  inactiveClass,
  isActive,
  size
}: {
  activeClass: string;
  icon: TabItemProps['icon'];
  inactiveClass: string;
  isActive: boolean;
  size: number;
}) {
  const stateClass = isActive ? activeClass : inactiveClass;
  if (React.isValidElement(icon)) {
    const dimension = size === 16 ? 4 : 5;
    return React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
      className: cn(`h-${dimension} w-${dimension}`, stateClass)
    });
  }
  if (isIconComponent(icon)) {
    return React.createElement(icon as React.ComponentType<{ size?: number; className?: string }>, {
      className: stateClass,
      size
    });
  }
  return icon as React.ReactNode;
}

function DescriptionTooltip({ description, isActive }: { description: string; isActive: boolean }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'mt-1 hidden w-full truncate pr-2 text-left text-xs md:block',
              isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'
            )}
          >
            {description}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs" side="right">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type PillState = 'disabled' | 'active' | 'idle';
const STATE_COLOR: Record<PillState, string> = {
  disabled: 'bg-muted/10 text-muted-foreground border-border',
  active: 'bg-accent text-accent-foreground border-accent',
  idle: 'bg-muted/40 text-foreground/80 hover:bg-muted/60 border-border'
};
const MD_STATE_COLOR: Record<PillState, string> = {
  disabled: 'md:opacity-50 md:cursor-not-allowed',
  active: 'md:bg-accent/30 md:text-accent-foreground md:border-accent',
  idle: 'md:text-foreground md:opacity-70 md:hover:bg-muted/10 md:hover:opacity-90 md:border-border'
};

function pillState(disabled: boolean, isActive: boolean): PillState {
  if (disabled) return 'disabled';
  if (isActive) return 'active';
  return 'idle';
}

function getPillClassName({
  disabled,
  isActive,
  isTop
}: {
  disabled: boolean;
  isActive: boolean;
  isTop: boolean;
}): string {
  const state = pillState(disabled, isActive);
  return cn(
    'flex items-center gap-2 rounded-lg border text-sm shadow-sm transition-colors duration-150 md:flex md:items-center md:rounded-lg',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    isTop
      ? 'min-w-fit justify-center whitespace-nowrap px-3 py-2'
      : 'min-w-fit justify-start px-3 py-1 md:min-w-0',
    isTop ? 'md:justify-center md:px-4 md:py-2' : 'md:w-full md:justify-start md:px-4 md:py-2',
    STATE_COLOR[state],
    MD_STATE_COLOR[state]
  );
}

function useTabClick(
  onClick: TabItemProps['onClick'],
  href: string | undefined,
  disabled: boolean
) {
  return useCallback(
    (event: React.MouseEvent) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      if (!onClick) return;
      if (!href) event.preventDefault();
      onClick();
    },
    [disabled, href, onClick]
  );
}

function TabControl({
  ariaCurrent,
  ariaLabel,
  children,
  className,
  dataTestId,
  disabled,
  handleClick,
  href
}: {
  ariaCurrent?: 'page';
  ariaLabel?: string;
  children: React.ReactNode;
  className: string;
  dataTestId?: string;
  disabled: boolean;
  handleClick: (event: React.MouseEvent) => void;
  href?: string;
}) {
  if (href && !disabled) {
    return (
      <a
        aria-current={ariaCurrent}
        aria-label={ariaLabel}
        className={className}
        data-testid={dataTestId}
        href={href}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      className={className}
      data-testid={dataTestId}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
}

function DisabledTabTooltip({
  children,
  message
}: {
  children: React.ReactNode;
  message?: string;
}) {
  if (!message) return children;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-full">{children}</span>
        </TooltipTrigger>
        <TooltipContent side="right">{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StandardPillContent({
  description,
  icon,
  indicatorColor,
  indicatorSize,
  indicatorText,
  isActive,
  isTop,
  showIndicator,
  title
}: Pick<
  TabItemProps,
  | 'description'
  | 'icon'
  | 'indicatorColor'
  | 'indicatorSize'
  | 'indicatorText'
  | 'showIndicator'
  | 'title'
> & {
  isActive: boolean;
  isTop: boolean;
}) {
  return (
    <>
      {icon && (
        <div
          className={cn(
            'mr-2 mt-0 shrink-0 md:mr-3 md:mt-1',
            isActive ? 'text-primary' : 'text-muted-foreground/90',
            showIndicator && 'hidden md:block'
          )}
        >
          <TabIcon
            activeClass="text-foreground"
            icon={icon}
            inactiveClass="text-muted-foreground"
            isActive={isActive}
            size={24}
          />
        </div>
      )}
      <div className="flex min-w-0 grow flex-col items-start text-left">
        <div className="flex w-full min-w-0 items-center gap-2">
          <span
            className={cn(
              'truncate text-left font-medium',
              isActive ? 'text-foreground' : 'text-foreground/80'
            )}
          >
            {title}
          </span>
          {showIndicator && (
            <div className={cn('shrink-0', isTop ? 'ml-1' : 'ml-auto')}>
              <PulsingDot color={indicatorColor} size={indicatorSize} />
            </div>
          )}
          {showIndicator && !isTop && indicatorText && (
            <span
              className={cn(
                'hidden shrink-0 text-xs md:inline',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {indicatorText}
            </span>
          )}
        </div>
        {description && !isTop && (
          <DescriptionTooltip description={description} isActive={isActive} />
        )}
      </div>
    </>
  );
}

/**
 * A section tab: muted label, a soft chip on hover, and the current tab in full-strength type over
 * a 2px bar sitting on the strip's hairline.
 */
function getUnderlineClassName({
  disabled,
  isActive
}: {
  disabled: boolean;
  isActive: boolean;
}): string {
  return cn(
    'group/tab relative isolate box-border inline-flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none',
    'before:absolute before:inset-x-0 before:inset-y-1 before:-z-10 before:rounded-md before:transition-colors before:duration-150 focus-visible:before:ring-2 focus-visible:before:ring-ring/50',
    'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    isActive
      ? 'text-foreground after:bg-foreground'
      : 'text-muted-foreground hover:text-foreground hover:before:bg-muted'
  );
}

function parseUnderlineTabTitle(title: string) {
  const match = title.match(/^(.+?)\s\(([^)]+)\)$/);
  if (!match || match[2] === '0') return { count: null, label: match ? match[1] : title };
  return { count: match[2], label: match[1] };
}

function UnderlineTabContent({
  isActive,
  showIndicator,
  indicatorColor,
  indicatorSize,
  title
}: Pick<TabItemProps, 'indicatorColor' | 'indicatorSize' | 'showIndicator' | 'title'> & {
  isActive: boolean;
}) {
  const { count, label } = parseUnderlineTabTitle(title);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="absolute top-1/2 -left-0.5 h-4 w-px -translate-y-1/2 bg-border group-first/tab:hidden"
      />
      <span>{label}</span>
      {count ? (
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 pt-px text-xs font-semibold leading-none tabular-nums transition-colors duration-150',
            isActive
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground group-hover/tab:bg-accent group-hover/tab:text-foreground'
          )}
        >
          {count}
        </span>
      ) : null}
      {showIndicator && <PulsingDot color={indicatorColor} size={indicatorSize} />}
    </span>
  );
}

const UnderlineTab = React.memo(function UnderlineTab({
  disabled = false,
  disabledTooltip,
  href,
  isActive = false,
  onClick,
  ...props
}: TabItemProps) {
  const handleClick = useTabClick(onClick, href, disabled);
  const control = (
    <TabControl
      ariaCurrent={isActive ? 'page' : undefined}
      ariaLabel={props.title}
      className={getUnderlineClassName({ disabled, isActive })}
      dataTestId={props['data-testid']}
      disabled={disabled}
      handleClick={handleClick}
      href={href}
    >
      <UnderlineTabContent {...props} isActive={isActive} />
    </TabControl>
  );
  return (
    <DisabledTabTooltip message={disabled && disabledTooltip ? disabledTooltip : undefined}>
      {control}
    </DisabledTabTooltip>
  );
});

const StandardPillTab = React.memo(function StandardPillTab({
  disabled = false,
  disabledTooltip,
  href,
  isActive = false,
  onClick,
  position = 'side',
  ...props
}: TabItemProps) {
  const handleClick = useTabClick(onClick, href, disabled);
  const isTop = position === 'top';
  const control = (
    <TabControl
      className={getPillClassName({ disabled, isActive, isTop })}
      dataTestId={props['data-testid']}
      disabled={disabled}
      handleClick={handleClick}
      href={href}
    >
      <StandardPillContent {...props} isActive={isActive} isTop={isTop} />
    </TabControl>
  );
  return (
    <DisabledTabTooltip message={disabled && disabledTooltip ? disabledTooltip : undefined}>
      {control}
    </DisabledTabTooltip>
  );
});

function SidebarTabContent({
  icon,
  indicatorColor,
  indicatorSize,
  isActive,
  showIndicator,
  title
}: Pick<TabItemProps, 'icon' | 'indicatorColor' | 'indicatorSize' | 'showIndicator' | 'title'> & {
  isActive: boolean;
}) {
  return (
    <>
      {icon && (
        <span className="shrink-0">
          <TabIcon
            activeClass="text-foreground"
            icon={icon}
            inactiveClass=""
            isActive={isActive}
            size={16}
          />
        </span>
      )}
      <span className="truncate">{title}</span>
      {showIndicator && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <PulsingDot color={indicatorColor} size={indicatorSize} />
        </div>
      )}
    </>
  );
}

const Tab: React.FC<TabItemProps> = (props) => {
  const {
    disabled = false,
    disabledTooltip,
    href,
    isActive = false,
    onClick,
    position = 'side',
    variant = 'pill'
  } = props;
  const handleClick = useTabClick(onClick, href, disabled);
  if (position === 'top' && variant === 'underline') return <UnderlineTab {...props} />;
  if (position !== 'sidebar') return <StandardPillTab {...props} />;

  const className = cn(
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
    disabled
      ? 'cursor-not-allowed text-muted-foreground opacity-50'
      : isActive
        ? 'bg-accent font-medium text-accent-foreground'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
  );
  const control = (
    <TabControl
      className={className}
      dataTestId={props['data-testid']}
      disabled={disabled}
      handleClick={handleClick}
      href={href}
    >
      <SidebarTabContent {...props} isActive={isActive && !disabled} />
    </TabControl>
  );
  return (
    <DisabledTabTooltip message={disabled && disabledTooltip ? disabledTooltip : undefined}>
      {control}
    </DisabledTabTooltip>
  );
};

export default Tab;
