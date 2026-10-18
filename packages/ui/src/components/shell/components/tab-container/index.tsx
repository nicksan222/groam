'use client';

import { cn } from '@groam/ui/lib/utils';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type SlotKind, useShellSlots } from '#src/components/shell/context';
import type { TabContainerProps } from '#src/components/shell/types';
import { SHELL_PAGE_INSET } from '#src/lib/shell-layout';
import { flattenFragments, isTabElement } from './fragment-utils';
import { SidebarDesktopAside } from './sidebar-desktop-aside';
import { SidebarMobileNav } from './sidebar-mobile-nav';

/**
 * Shell TabContainer — displays registered tabs.
 *
 * - `top`:     always horizontal pill chips
 * - `side`:    horizontal on mobile, vertical pills on desktop
 * - `sidebar`: compact mobile chip bar + clean desktop aside with ScrollArea
 *
 * `side` and `sidebar` variants register with the Shell slot context and
 * portal into the Shell-rendered slot grid, so they can be nested under
 * any wrapper component (fragments, function components) and still place
 * themselves correctly in the layout.
 */
const TabContainer: React.FC<TabContainerProps> = ({
  children,
  position = 'top',
  variant = 'pill',
  header,
  mobileHeader,
  width = 260,
  pageInset = position === 'top',
  className,
  'data-testid': dataTestId
}) => {
  const slots = useShellSlots();
  const addConsumer = slots?.addConsumer;
  const removeConsumer = slots?.removeConsumer;
  const slotKind: SlotKind | null =
    position === 'side' ? 'sideTab' : position === 'sidebar' ? 'sidebarTab' : null;

  useEffect(() => {
    if (!slotKind || !addConsumer || !removeConsumer) return;
    addConsumer(slotKind);
    return () => removeConsumer(slotKind);
  }, [slotKind, addConsumer, removeConsumer]);

  const flatChildren = flattenFragments(children);
  const mountedChildren = flatChildren.map((child, index) => {
    if (!isTabElement(child)) return child;
    const key = child.key ?? `tab-${index}`;
    return React.cloneElement(child, {
      ...(child.props.position === undefined ? { position } : {}),
      ...(child.props.variant === undefined ? { variant } : {}),
      key
    });
  });

  const tabElements = mountedChildren.filter(isTabElement);

  let rendered: React.ReactNode;
  if (position === 'sidebar') {
    rendered = (
      <>
        <SidebarMobileNav tabs={tabElements} header={mobileHeader} data-testid={dataTestId} />
        <SidebarDesktopAside
          tabs={tabElements}
          header={header}
          width={width}
          className={className}
          data-testid={dataTestId}
        />
      </>
    );
  } else {
    rendered = (
      <div
        className={cn(
          'w-full max-w-[100vw] md:max-w-full overflow-x-auto',
          {
            'flex flex-nowrap md:flex-col md:overflow-y-auto pt-4 gap-2 px-2 sm:px-4 md:px-4':
              position === 'side',
            'flex flex-nowrap gap-2 py-3': position === 'top' && variant === 'pill',
            'flex flex-nowrap items-end gap-0 min-h-10 overflow-x-auto overflow-y-visible overscroll-x-contain px-0 py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden':
              position === 'top' && variant === 'underline'
          },
          pageInset && SHELL_PAGE_INSET,
          className
        )}
        data-testid={dataTestId}
      >
        {mountedChildren}
      </div>
    );
  }

  if (slotKind && slots) {
    const slotEl = slots.slots[slotKind].el;
    return slotEl ? createPortal(rendered, slotEl) : null;
  }
  return rendered;
};

export default TabContainer;
