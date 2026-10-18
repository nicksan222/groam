/** How far the pointer travels before a press turns into a pan, so plain clicks still land. */
export const PAN_THRESHOLD = 4;

/** What a press has to land on to leave the board alone: cards and anything the viewer can operate. */
const operable = 'a, button, input, select, textarea, article, [role="button"], [data-card-id]';

export const startsOnEmptySpace = (target: EventTarget | null) =>
  target instanceof Element && target.closest(operable) === null;

export const exceedsPanThreshold = (distance: number) => Math.abs(distance) >= PAN_THRESHOLD;

/** Dragging the board right shows what is to its left, so the scroll position moves the other way. */
export const panScrollLeft = (startScrollLeft: number, startX: number, x: number) =>
  startScrollLeft - (x - startX);
