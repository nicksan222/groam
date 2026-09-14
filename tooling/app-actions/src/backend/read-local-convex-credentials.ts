import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LocalConvexCredentials = {
  adminKey: string;
  url: string;
};

export function readLocalConvexCredentials(
  root: string,
  convexUrl: string
): LocalConvexCredentials {
  const config: unknown = JSON.parse(
    readFileSync(join(root, '.convex/local/default/config.json'), 'utf8')
  );
  if (typeof config !== 'object' || config === null) {
    throw new Error('Local Convex configuration is invalid');
  }
  const adminKey = 'adminKey' in config ? config.adminKey : undefined;
  const ports = 'ports' in config ? config.ports : undefined;
  const cloudPort =
    typeof ports === 'object' && ports !== null && 'cloud' in ports ? ports.cloud : undefined;
  const url = new URL(convexUrl);
  if (
    typeof adminKey !== 'string' ||
    adminKey.length === 0 ||
    typeof cloudPort !== 'number' ||
    Number(url.port) !== cloudPort
  ) {
    throw new Error('Local Convex credentials do not match the configured backend');
  }
  return { adminKey, url: url.origin };
}
