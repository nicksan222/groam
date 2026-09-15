#!/usr/bin/env bun

import { createBackendActions } from '@groam/app-actions/backend';
import { env } from '@groam/env/seeder';
import { parseSeedOptions, seedUsage } from './options';
import { resolveSeedScenario } from './seed-scenario';
import { seedWorkspace } from './seed-workspace';

const options = parseSeedOptions(process.argv.slice(2));
if ('help' in options) {
  console.info(seedUsage.trim());
  process.exit(0);
}

if (!env.seedSiteUrl) throw new Error('SEED_SITE_URL or VITE_CONVEX_SITE_URL is required');
if (!env.seedConvexUrl) throw new Error('SEED_CONVEX_URL or VITE_CONVEX_URL is required');

const scenario = resolveSeedScenario({
  scale: options.scale,
  ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
  ...(options.tripCount === undefined ? {} : { tripCount: options.tripCount }),
  ...(options.userCount === undefined ? {} : { userCount: options.userCount })
});
const app = createBackendActions({
  convexUrl: env.seedConvexUrl,
  siteUrl: env.seedSiteUrl
});

console.info(
  `Scenario: ${options.scale} (${scenario.userCount} users, ${scenario.tripCount} trips, concurrency ${scenario.concurrency})`
);

try {
  const result = await seedWorkspace(app, {
    owner: {
      email: env.seedUserEmail,
      name: 'Groam Demo',
      password: env.seedUserPassword
    },
    reset: options.reset,
    scenario
  });
  const resetSummary = result.reset
    ? `, ${result.reset.imported} local tables reset`
    : ', existing local data reused';
  console.info(
    `Seeded ${result.users.length} users and ${result.tripCount} trips in ${result.workspace.organizationName}${resetSummary}.`
  );
  console.info(
    `Demo login: ${result.authenticatedOwner.email} / ${result.authenticatedOwner.password}`
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
