export type BackendActionsConfig = {
  convexUrl: string;
  siteUrl: string;
};

const localHosts = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

export function assertLocalDevelopmentUrl(value: string, label: string): void {
  const url = new URL(value);
  if (
    !localHosts.has(url.hostname) ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error(`${label} must target localhost over HTTP; app actions cannot run remotely`);
  }
}

export class BackendSession {
  constructor(readonly config: BackendActionsConfig) {
    assertLocalDevelopmentUrl(config.convexUrl, 'Convex URL');
    assertLocalDevelopmentUrl(config.siteUrl, 'Convex site URL');
  }
}
