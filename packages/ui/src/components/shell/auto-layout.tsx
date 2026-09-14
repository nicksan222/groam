'use client';

import type React from 'react';
import { useCallback } from 'react';

import Footer from './components/footer';
import Header from './components/header';
import { useShellSlots } from './context';
import { extractChildrenNotOfType, extractChildrenOfType } from './utils/children';

/**
 * AutoLayoutWrapper renders Shell's body layout based on which slot
 * consumers have registered (via the ShellSlotsProvider):
 *
 * - sidebar TabContainer + content → flex-row aside + content
 * - side TabContainer + content    → 4-col grid (1 + 3)
 * - content only                   → single content area
 *
 * TabContainer (position="side"|"sidebar") and Content portal into the
 * slot DOM nodes rendered here, so they can be nested under any wrapper
 * (function components, fragments) — the slot grid still applies.
 */
export const AutoLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const slots = useShellSlots();

  const headers = extractChildrenOfType(children, Header);
  const footers = extractChildrenOfType(children, Footer);
  const restAfterHeaders = extractChildrenNotOfType(children, Header);
  const restChildren = extractChildrenNotOfType(restAfterHeaders, Footer);

  const setSlotEl = slots?.setSlotEl;

  const sideTabRef = useCallback(
    (el: HTMLDivElement | null) => setSlotEl?.('sideTab', el),
    [setSlotEl]
  );
  const sidebarTabRef = useCallback(
    (el: HTMLDivElement | null) => setSlotEl?.('sidebarTab', el),
    [setSlotEl]
  );
  const contentRef = useCallback(
    (el: HTMLDivElement | null) => setSlotEl?.('content', el),
    [setSlotEl]
  );

  const hasSideTab = (slots?.slots.sideTab.consumers ?? 0) > 0;
  const hasSidebarTab = (slots?.slots.sidebarTab.consumers ?? 0) > 0;

  const layout: 'sidebar' | 'side' | 'plain' = hasSidebarTab
    ? 'sidebar'
    : hasSideTab
      ? 'side'
      : 'plain';

  return (
    <>
      {headers}
      {restChildren}
      {layout === 'sidebar' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          <div ref={sidebarTabRef} className="md:flex md:flex-col md:shrink-0" />
          <div ref={contentRef} className="min-h-0 min-w-0 flex-1 overflow-hidden" />
        </div>
      )}
      {layout === 'side' && (
        <div className="md:grid md:grid-cols-4 flex-1 min-h-0 min-w-0">
          <div ref={sideTabRef} className="md:col-span-1 min-w-0" />
          <div ref={contentRef} className="md:col-span-3 min-h-0 min-w-0 overflow-hidden" />
        </div>
      )}
      {/* Render unconditionally so the content slot element is stable: gating
          on consumer count made this div mount/unmount, which re-fired the
          ref → setSlotEl on every commit and spun React error #185. */}
      {layout === 'plain' && (
        <div ref={contentRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" />
      )}
      {footers}
    </>
  );
};
