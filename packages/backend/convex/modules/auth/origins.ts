const localHostnames = new Set(['127.0.0.1', '[::1]', 'localhost']);
const localViteOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173'
] as const;

const isLocalOrigin = (value: string) => localHostnames.has(new URL(value).hostname);

export function resolveAuthTrustedOrigins(authSiteUrl: string, authBaseUrl: string): string[] {
  const origins = new Set([new URL(authSiteUrl).origin]);
  if (isLocalOrigin(authSiteUrl) || isLocalOrigin(authBaseUrl)) {
    for (const origin of localViteOrigins) origins.add(origin);
  }
  return [...origins];
}
