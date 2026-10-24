#!/usr/bin/env bun

import { createBackendActions } from '@groam/app-actions/backend';
import { env } from '@groam/env/seeder';
import { parseSeedOptions, seedUsage } from './options';
import { seedWorkspace } from './seed-workspace';

const options = parseSeedOptions(process.argv.slice(2));
if ('help' in options) {
  console.info(seedUsage.trim());
  process.exit(0);
}

if (!env.seedSiteUrl) throw new Error('SEED_SITE_URL or VITE_CONVEX_SITE_URL is required');
if (!env.seedConvexUrl) throw new Error('SEED_CONVEX_URL or VITE_CONVEX_URL is required');

const app = createBackendActions({
  convexUrl: env.seedConvexUrl,
  siteUrl: env.seedSiteUrl
});

try {
  const result = await seedWorkspace(app, {
    owner: {
      email: env.seedUserEmail,
      name: 'Elena Marchetti',
      password: env.seedUserPassword
    },
    concurrency: options.concurrency ?? 4,
    reset: options.reset
  });
  const resetSummary = result.reset
    ? `, ${result.reset.imported} local tables reset`
    : ', existing local data reused';
  console.info(
    `Seeded ${result.userCount} travelers in ${result.groupCount} groups with ${result.tripCount} trips, ${result.issueCount} issues and ${result.researchCount} researches${resetSummary}.`
  );
  console.info(`Demo login: ${result.owner.email} / ${result.owner.password}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
