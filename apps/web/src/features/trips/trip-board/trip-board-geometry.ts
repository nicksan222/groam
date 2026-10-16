import type { ClientRect } from '@dnd-kit/core';

export const centre = (rect: ClientRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2
});

/** Whether `rect`'s centre sits lower than `other`'s. */
export const isBelow = (rect: ClientRect, other: ClientRect) => centre(rect).y > centre(other).y;

export const contains = (rect: ClientRect, point: { x: number; y: number }) =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
