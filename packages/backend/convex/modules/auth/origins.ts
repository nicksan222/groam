const localHostnames = new Set(['127.0.0.1', '[::1]', 'localhost']);
// 5173 serves the app; 5174 serves browser-mode journeys (`vp test`).
const localViteOrigins = ['5173', '5174'].flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  `http://[::1]:${port}`
]);

const isLocalOrigin = (value: string) => localHostnames.has(new URL(value).hostname);

export function resolveAuthTrustedOrigins(authSiteUrl: string, authBaseUrl: string): string[] {
  const origins = new Set([new URL(authSiteUrl).origin]);
  if (isLocalOrigin(authSiteUrl) || isLocalOrigin(authBaseUrl)) {
    for (const origin of localViteOrigins) origins.add(origin);
  }
  return [...origins];
}
