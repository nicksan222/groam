import type { Environment } from '#src/environments';
import { releaseTarget } from '#src/release/target';

/** Test settings shaped like a committed environment, on example domains. */
export const productionSettings: Environment = {
  convexUrl: 'https://groam-demo.convex.cloud',
  cloudflareAccountId: 'a'.repeat(32),
  workersSubdomain: 'groam',
  web: { worker: 'groam-app', host: 'app.groam.example' },
  landing: { worker: 'groam-landing', host: 'groam.example' }
};

export const productionTarget = releaseTarget('production', productionSettings);

export const betaTarget = releaseTarget('beta', {
  convexUrl: 'https://groam-beta.convex.cloud',
  cloudflareAccountId: '',
  workersSubdomain: 'groam-beta.workers.dev',
  web: { worker: 'groam-app-beta', host: 'app.beta.groam.example' },
  landing: { worker: 'groam-landing-beta', host: 'beta.groam.example' }
});
