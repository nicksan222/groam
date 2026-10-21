import { expect, test } from 'vite-plus/test';
import { backendEnvironment } from '#src/convex/cli';

test('the backend deploy only inherits the deployment-scoped Convex credential', () => {
  expect(
    backendEnvironment({
      PATH: '/bin',
      CONVEX_DEPLOY_KEY: 'deployment',
      CONVEX_TEAM_ACCESS_TOKEN: 'management',
      CONVEX_DEPLOYMENT: 'dev:local',
      STRIPE_API_KEY: 'stripe',
      CLOUDFLARE_API_TOKEN: 'cloudflare'
    })
  ).toEqual({ PATH: '/bin', CONVEX_DEPLOY_KEY: 'deployment', CONVEX_AGENT_MODE: 'anonymous' });
});
