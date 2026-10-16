import Shell from '@groam/ui/components/shell/client';
import { useEffect, useRef } from 'react';
import type { TripTabItem, TripTabsProps } from '@/types/trip-tabs';

function tabTitle({ count, label }: TripTabItem) {
  return count === undefined ? label : `${label} (${count})`;
}

/**
 * The tab strip under a trip header. On a phone it scrolls, snaps to each tab, leaves room after
 * the last one, and keeps the active tab in view.
 */
export function TripTabs<Key extends string>({
  activeKey,
  ariaLabel,
  disabled = false,
  hrefFor,
  onOpen,
  tabs
}: TripTabsProps<Key>) {
  const wrapper = useRef<HTMLDivElement>(null);
  const activeTestId = tabs.find((tab) => tab.key === activeKey)?.testId;
  useEffect(() => {
    const scroller = wrapper.current?.querySelector<HTMLElement>('nav > div');
    const active = wrapper.current?.querySelector<HTMLElement>(`[data-testid="${activeTestId}"]`);
    if (!scroller || !active) return;
    const left = active.offsetLeft - scroller.offsetLeft;
    const visibleStart = scroller.scrollLeft;
    const visibleEnd = visibleStart + scroller.clientWidth;
    if (left < visibleStart || left + active.offsetWidth > visibleEnd) {
      scroller.scrollTo({ behavior: 'auto', left: Math.max(0, left - 24) });
    }
  }, [activeTestId, tabs.length]);

  return (
    <div ref={wrapper}>
      <Shell.UnderlineNav
        aria-label={ariaLabel}
        className="px-3 sm:px-2 [&>div]:snap-x [&>div]:scroll-px-3 [&>div]:pe-8 sm:[&>div]:pe-0 [&_button]:snap-start [&_a]:snap-start"
        pageInset={false}
      >
        {tabs.map((tab) => (
          <Shell.Tab
            data-testid={tab.testId}
            disabled={disabled}
            href={hrefFor?.(tab.key)}
            isActive={tab.key === activeKey}
            key={tab.key}
            onClick={onOpen ? () => onOpen(tab.key) : undefined}
            position="top"
            title={tabTitle(tab)}
          />
        ))}
      </Shell.UnderlineNav>
    </div>
  );
}
