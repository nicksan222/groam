import { env } from '@groam/env/web-client';

const viteBase = env.basePath;

/** The router's `basepath` for a Vite base: no trailing slash, and none at all for the root. */
export function routerBasepath(base: string = viteBase): string {
  return base.replace(/\/+$/u, '');
}

/** The full URL of an app path (`/issues/abc`), keeping the base path the app is hosted under. */
export function absoluteHref(
  path: string,
  { base = viteBase, origin = window.location.origin }: { base?: string; origin?: string } = {}
): string {
  return new URL(`${routerBasepath(base)}${path}`, origin).href;
}
