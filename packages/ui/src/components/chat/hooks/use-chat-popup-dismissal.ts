'use client';

import { type RefObject, useEffect, useRef } from 'react';

const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' '
]);
const KEY_HANDLING_TARGETS =
  'input, textarea, select, button, a, [contenteditable], [role=menu], [role=listbox], [role=combobox], [role=slider], [role=tablist]';
const OVERFLOWS = /auto|scroll/;

/** A key that scrolls the page, pressed outside controls that handle it themselves. */
function isScrollKey(event: KeyboardEvent, target: Element): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;
  return SCROLL_KEYS.has(event.key) && !target.closest(KEY_HANDLING_TARGETS);
}

function isScrollable(element: Element): boolean {
  const style = getComputedStyle(element);
  const page = element === element.ownerDocument.scrollingElement;
  const vertical =
    element.scrollHeight > element.clientHeight && (page || OVERFLOWS.test(style.overflowY));
  const horizontal =
    element.scrollWidth > element.clientWidth && (page || OVERFLOWS.test(style.overflowX));
  return vertical || horizontal;
}

function closestScroller(element: Element | null): Element | null {
  for (let current = element; current; current = current.parentElement) {
    if (isScrollable(current)) return current;
  }
  return null;
}

function pointerPoint(event: Event): { clientX: number; clientY: number } | undefined {
  if (event instanceof WheelEvent) return event;
  if (event instanceof TouchEvent) return event.touches[0];
  return undefined;
}

function contains(bounds: DOMRect, point: { clientX: number; clientY: number }): boolean {
  return (
    point.clientX >= bounds.left &&
    point.clientX <= bounds.right &&
    point.clientY >= bounds.top &&
    point.clientY <= bounds.bottom
  );
}

/** Whether a pointer is over one of the trigger's scrolling ancestors. */
function isOverTriggerScroller(trigger: HTMLElement, event: Event): boolean {
  const point = pointerPoint(event);
  if (!point) return false;
  for (let element = trigger.parentElement; element; element = element.parentElement) {
    if (isScrollable(element) && contains(element.getBoundingClientRect(), point)) return true;
  }
  return false;
}

/**
 * Whether user scroll input should close a popup opened from `trigger`. Automatic scrolling and
 * navigation inside menus or popovers never dismiss it.
 */
function shouldDismiss(event: Event, trigger: HTMLElement): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.closest('[role="menu"], [data-slot="popover-popup"]')) return false;
  if (event instanceof KeyboardEvent && !isScrollKey(event, target)) return false;
  const scroller = closestScroller(target);
  if (scroller) return scroller.contains(trigger);
  // Modal menus intercept wheel/touch input with a backdrop over the scroller.
  return isOverTriggerScroller(trigger, event);
}

/** Closes a chat popup when the reader scrolls the conversation it was opened from. */
export function useChatPopupDismissal(
  active: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void
): void {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!active || !trigger) return;
    const ownerDocument = trigger.ownerDocument;
    const onScrollInput = (event: Event): void => {
      if (shouldDismiss(event, trigger)) onDismissRef.current();
    };
    ownerDocument.addEventListener('wheel', onScrollInput, { passive: true });
    ownerDocument.addEventListener('touchmove', onScrollInput, { passive: true });
    ownerDocument.addEventListener('keydown', onScrollInput, { passive: true });
    return () => {
      ownerDocument.removeEventListener('wheel', onScrollInput);
      ownerDocument.removeEventListener('touchmove', onScrollInput);
      ownerDocument.removeEventListener('keydown', onScrollInput);
    };
  }, [active, triggerRef]);
}
