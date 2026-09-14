export const APP_SHELLS = ['web', 'desktop'] as const;

export type AppShell = (typeof APP_SHELLS)[number];

export function isAppShell(value: unknown): value is AppShell {
  return APP_SHELLS.some((shell) => shell === value);
}

/** Desktop only when explicitly requested; anything else is the hosted web app. */
export function resolveAppShell(value: string | undefined): AppShell {
  return value === 'desktop' ? 'desktop' : 'web';
}
