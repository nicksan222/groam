import * as chat from '@/content/feature-conversations';
import * as ideas from '@/content/feature-ideas';
import * as issues from '@/content/feature-issues';
import * as itinerary from '@/content/feature-itinerary';
import * as homePile from '@/content/home-pile';

/** Only this page's dynamic examples join its browser dictionary; legal copy stays on the server. */
export function runtimeSourceMessages(path: string): Set<string> {
  const source =
    path === '/'
      ? homePile
      : path === '/features/issues/'
        ? issues
        : path === '/features/conversations/'
          ? chat
          : path === '/features/ideas/'
            ? ideas
            : path === '/features/itinerary/'
              ? itinerary
              : {};
  const strings = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'string') strings.add(value.replace(/\s+/gu, ' ').trim());
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(source);
  return strings;
}
