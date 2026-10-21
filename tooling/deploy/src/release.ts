import { env } from '@groam/env/production';
import { deployBackend } from '#src/convex/deploy';
import { syncBackendSettings } from '#src/convex/settings';
import { environments } from '#src/environments';
import { assertCleanCheckout, assertTestedCommit } from '#src/release/checkout';
import { assertTrustedPublisher } from '#src/release/publisher';
import { releaseTarget } from '#src/release/target';
import { assertPreflight } from '#src/setup/preflight';
import { deployFrontends } from '#src/void/deploy';

// Verify everything first, then publish Convex, the web app, and the landing site in that order.
// The three publications are not atomic; a failure after Convex leaves earlier frontends live.
if (import.meta.main) {
  const target = releaseTarget(env.environment, environments[env.environment]);

  assertTrustedPublisher(target, env);
  assertTestedCommit(env.sha);
  // Every variable, secret, and lock the environment needs (@groam/env/deployment).
  await assertPreflight(target.environment);
  assertCleanCheckout();

  syncBackendSettings(target);
  deployBackend(target, env.sha);
  deployFrontends(target);

  // Void records newly provisioned resources in its lock; a change must be committed first.
  assertCleanCheckout();
}
