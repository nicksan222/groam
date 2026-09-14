import { env as desktopToolingEnv } from '@groam/env/desktop-tooling';

const DEFAULT_PHOTON_URL = 'https://photon.komoot.io';
const DEFAULT_MAP_TILES_URL = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

const baseConnectSrc = [
  "'self'",
  'http://127.0.0.1:3210',
  'http://127.0.0.1:3211',
  'ws://127.0.0.1:3210',
  'http://localhost:5173',
  'ws://localhost:5173',
  'https://commons.wikimedia.org',
  'https://en.wikipedia.org',
  'https://upload.wikimedia.org',
  'https://tile.openstreetmap.org'
] as const;

export function originFromUrl(value: string): string | undefined {
  try {
    const normalized = value.replaceAll('{z}', '0').replaceAll('{x}', '0').replaceAll('{y}', '0');
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function uniqueOrigins(values: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    origins.push(value);
  }
  return origins;
}

export function desktopCsp(options: { mapTilesUrl?: string; photonUrl?: string } = {}): string {
  const extras = uniqueOrigins([
    originFromUrl(options.photonUrl ?? DEFAULT_PHOTON_URL),
    originFromUrl(options.mapTilesUrl ?? DEFAULT_MAP_TILES_URL)
  ]);
  const connectSrc = uniqueOrigins([...baseConnectSrc, ...extras]);
  const httpExtras = extras.filter((origin) => origin.startsWith('http://'));
  const imgSrc = uniqueOrigins([
    "'self'",
    'data:',
    'blob:',
    'https:',
    'http://127.0.0.1:3211',
    'http://127.0.0.1:3210',
    ...httpExtras
  ]);
  return [
    `default-src 'self' http://127.0.0.1:3211 http://127.0.0.1:3210`,
    `connect-src ${connectSrc.join(' ')}`,
    `img-src ${imgSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    `worker-src 'self' blob:`,
    `media-src 'self' blob: http://127.0.0.1:3211`,
    `font-src 'self' data:`,
    `frame-src 'none'`
  ].join('; ');
}

function desktopCspFromEnv(
  env: { mapTilesUrl?: string; photonUrl?: string } = desktopToolingEnv
): string {
  return desktopCsp({
    mapTilesUrl: env.mapTilesUrl,
    photonUrl: env.photonUrl
  });
}

export function tauriCspOverlay(
  options: { skipBeforeBuild?: boolean } = {},
  env: { mapTilesUrl?: string; photonUrl?: string } = desktopToolingEnv
) {
  return {
    ...(options.skipBeforeBuild ? { build: { beforeBuildCommand: '' } } : {}),
    app: {
      security: {
        csp: desktopCspFromEnv(env)
      }
    }
  };
}
