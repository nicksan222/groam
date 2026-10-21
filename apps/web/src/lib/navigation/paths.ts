import type { RouteTarget } from '@/types/navigation';

/** The browser URL of a typed destination. */
export function href({ hash, params, search, to }: RouteTarget): string {
  const values: Record<string, string> = params ?? {};
  const path = to.replace(/\$(\w+)/gu, (_, name: string) => encodeURIComponent(values[name] ?? ''));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search ?? {})) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ''}${hash ? `#${hash}` : ''}`;
}
