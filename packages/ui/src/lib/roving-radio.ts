import type { KeyboardEvent } from 'react';

/**
 * Roving focus for a radio group built from buttons (`role="radio"` inside a `role="radiogroup"`):
 * arrow keys, Home and End move focus among the enabled radios and wrap, and nothing is chosen by
 * moving. Enter and Space pick, as they do on any button. Give it to each radio's `onKeyDown`.
 */
export function moveRadioFocus(event: KeyboardEvent<HTMLElement>) {
  const radios = [
    ...(event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])
  ].filter((radio) => !radio.matches(':disabled'));
  const at = radios.indexOf(event.currentTarget);
  const next = radios[(at + 1) % radios.length];
  const previous = radios[(at - 1 + radios.length) % radios.length];
  const target = {
    ArrowDown: next,
    ArrowLeft: previous,
    ArrowRight: next,
    ArrowUp: previous,
    End: radios.at(-1),
    Home: radios[0]
  }[event.key];
  if (!target) return;
  event.preventDefault();
  target.focus();
}
