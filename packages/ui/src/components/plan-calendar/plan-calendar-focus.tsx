import { useEffect } from 'react';
import { dateFromString } from '#src/lib/calendar-date';
import { useKloq } from '#tsx/vendor/kloq/calendar/chrome';

/** The nearest ancestor of `node` inside `root` that scrolls vertically, if any. */
function scrollParent(node: HTMLElement, root: HTMLElement): HTMLElement | null {
  for (
    let parent = node.parentElement;
    parent && root.contains(parent);
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
  }
  return null;
}

/**
 * Opens the calendar's own scroller on the first timed plan, or on 8 AM when nothing is timed.
 * Returns whether the scroller was laid out yet: before that there is nothing to scroll.
 */
function revealFirstEvent(): boolean {
  const frame = document.querySelector<HTMLElement>('[data-plan-calendar]');
  if (!frame) return false;
  const first = frame.querySelector<HTMLElement>('[data-cal-canvas] [data-cal-event]');
  if (first) {
    const scroller = scrollParent(first, frame);
    if (!scroller) return false;
    const offset =
      first.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, offset - scroller.clientHeight / 4);
    return true;
  }
  // Nothing is timed, so open the day grid at the start of the working day, not at midnight.
  const canvas = frame.querySelector<HTMLElement>('[data-cal-canvas]');
  const scroller = canvas ? scrollParent(canvas, frame) : null;
  if (!(canvas && scroller)) return false;
  const top =
    canvas.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  // Stop a little above 8 AM so its hour label stays readable.
  scroller.scrollTop = top + (canvas.offsetHeight / 24) * 8 - 16;
  return true;
}

/** Frames to wait for the scroller to be laid out and the plans to appear, and to settle after. */
const MAX_FRAMES = 120;
const SETTLE_FRAMES = 3;

/** Moves the calendar to `date` (`YYYY-MM-DD`) whenever the host asks for another day. */
export function PlanCalendarFocus({ date }: { date?: string }) {
  const { goToDate, view } = useKloq();
  // Phones and desktops alike open on the first plan of the day rather than the top of the grid.
  // The first frame has no size and no plans yet, so wait until the scroller can scroll, reveal, and
  // reveal once more after the plans settle. It runs once per mount; a new day goes through goToDate.
  useEffect(() => {
    let frameRequest = 0;
    let frames = 0;
    let revealedAt: number | null = null;
    const step = () => {
      frames += 1;
      if (revealedAt === null && revealFirstEvent()) revealedAt = frames;
      else if (revealedAt !== null && frames === revealedAt + SETTLE_FRAMES) {
        revealFirstEvent();
        return;
      }
      if (frames < MAX_FRAMES) frameRequest = requestAnimationFrame(step);
    };
    frameRequest = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRequest);
  }, []);
  useEffect(() => {
    const target = date ? dateFromString(date) : null;
    // A day already on screen stays where it is: moving would push trip days out of view.
    const shown = target && view.days.some((day) => day.getTime() === target.getTime());
    if (target && !shown) goToDate(target);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a new day moves the calendar
  }, [date]);
  return null;
}
