import { type UiTarget, ui } from './interaction';

export function sharedTripPath(target: UiTarget): string | undefined {
  const pathname = new URL(ui(target).page.url()).pathname;
  const tripRoot = /^(.*\/trips\/[^/]+)/u.exec(pathname)?.[1];
  return tripRoot ? `${tripRoot}/overview` : undefined;
}
