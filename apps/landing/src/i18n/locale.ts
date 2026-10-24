export const locales = ['en', 'it'] as const;
export type Locale = (typeof locales)[number];

export const publicPaths = [
  '/',
  '/features/',
  '/features/itinerary/',
  '/features/ideas/',
  '/features/issues/',
  '/features/conversations/',
  '/features/ai/',
  '/pricing/',
  '/privacy/',
  '/terms/'
] as const;

export function localeFromPath(path: string): Locale {
  return /^\/it(?:\/|$)/u.test(path) ? 'it' : 'en';
}

export function withoutLocale(path: string): string {
  const base = path.replace(/^\/it(?=\/|$)/u, '') || '/';
  return base === '/404/' ? '/404.html' : base;
}

/** Localize site pages only: assets, external destinations, hashes, and the app stay intact. */
export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const boundary = path.search(/[?#]/u);
  const pathname = boundary === -1 ? path : path.slice(0, boundary);
  const suffix = boundary === -1 ? '' : path.slice(boundary);
  const base = withoutLocale(pathname ?? '/');
  if (!publicPaths.includes(base as (typeof publicPaths)[number]) && base !== '/404.html')
    return path;
  if (base === '/404.html') return `${locale === 'it' ? '/it/404/' : '/404.html'}${suffix}`;
  return `${locale === 'it' ? '/it' : ''}${base}${suffix}`;
}
