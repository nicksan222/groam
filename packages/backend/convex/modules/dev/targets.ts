import { tables as betterAuthTables } from '#convex/components/better-auth/schema';
import schema from '#convex/schema';

export const geospatialResetTables = [
  'approximateCounters',
  'points',
  'pointsByCell',
  'pointsByFilterKey'
] as const;

export type ResetTarget = {
  component?: 'betterAuth' | 'geospatial';
  table: string;
};

export const resetTargets: ResetTarget[] = [
  ...Object.keys(schema.tables).map((table) => ({ table })),
  ...geospatialResetTables.map((table) => ({ component: 'geospatial' as const, table })),
  ...Object.keys(betterAuthTables).map((table) => ({ component: 'betterAuth' as const, table }))
];

const localHosts = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

export function assertLocalDevelopmentReset(siteUrl: string | undefined): void {
  if (!siteUrl) {
    throw new Error('Local reset requires CONVEX_SITE_URL or SITE_URL to target localhost');
  }
  const url = new URL(siteUrl);
  if (
    !localHosts.has(url.hostname) ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error('Local reset must target localhost; refusing a remote Convex deployment');
  }
}
