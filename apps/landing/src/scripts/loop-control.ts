import { translateText } from '@/i18n/runtime';

/** Keep the pressed state and accessible action together, in the visitor's language. */
export function updateLoopControl(
  button: HTMLButtonElement,
  paused: boolean,
  labels: { play: string; pause: string }
) {
  button.setAttribute('aria-pressed', String(paused));
  const text = translateText(paused ? labels.play : labels.pause);
  const label = button.querySelector<HTMLElement>('.visually-hidden, .sr');
  if (label) label.textContent = text;
  if (button.hasAttribute('aria-label') || !label) button.setAttribute('aria-label', text);
}
