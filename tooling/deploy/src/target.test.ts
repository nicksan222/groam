import { describe, expect, test } from 'vite-plus/test';
import { productionTarget, assertProductionPublisher, buildEnvironment } from './target';

const target = productionTarget(
  'https://groam-demo.convex.cloud',
  'https://groam.example/',
  'a'.repeat(32)
);
const publisher = {
  isGitHubActions: true,
  repository: 'nicksan222/groam',
  ref: 'refs/heads/main',
  eventName: 'push',
  sha: 'a'.repeat(40),
  keyDeploymentName: 'groam-demo',
  hasCloudflareToken: true
};

describe('production destination', () => {
  test('keeps the landing, app, and auth origins separate from the app base path', () => {
    expect(target.appUrl).toBe('https://groam.example/app/');
    expect(target.siteUrl).toBe('https://groam.example');
    expect(target.backendSiteUrl).toBe('https://groam-demo.convex.site');
    expect(target.deploymentName).toBe('groam-demo');
  });
  test('accepts matching regional origins without confusing the region with the deployment', () => {
    const regional = productionTarget(
      'https://pastel-ocelot-555.eu-west-1.convex.cloud',
      'https://groam.example'
    );
    expect(regional.deploymentName).toBe('pastel-ocelot-555');
    expect(regional.appUrl).toBe('https://groam.example/app/');
  });
  test.each([
    ['https://groam-demo.convex.cloud', 'https://groam-demo.convex.site'],
    ['https://groam-demo.convex.cloud', 'https://groam-demo.convex.cloud'],
    ['http://localhost:3210', 'http://localhost:3211'],
    ['https://groam-demo.convex.cloud', 'http://groam.example'],
    ['https://groam-demo.convex.cloud', 'https://groam-demo.convex.site/app/'],
    ['https://groam-demo.convex.cloud?key=secret', 'https://groam-demo.convex.site'],
    ['https://user:password@groam-demo.convex.cloud', 'https://groam-demo.convex.site']
  ])('rejects an ambiguous target', (cloud, site) => {
    expect(() => productionTarget(cloud, site)).toThrow();
  });
});

describe('production publishing boundary', () => {
  test('allows only a trusted main push or manual release with the matching production key', () => {
    expect(() => assertProductionPublisher(target, publisher)).not.toThrow();
    expect(() =>
      assertProductionPublisher(target, { ...publisher, eventName: 'workflow_dispatch' })
    ).not.toThrow();
  });
  test.each([
    { ref: 'refs/heads/feature' },
    { ref: 'refs/tags/main' },
    { repository: 'someone/groam' },
    { eventName: 'pull_request' },
    { eventName: 'pull_request_target' },
    { eventName: 'workflow_run' },
    { isGitHubActions: false },
    { keyDeploymentName: null },
    { keyDeploymentName: 'other' },
    { sha: '' },
    { hasCloudflareToken: false }
  ])('fails closed before a command can publish: %j', (override) => {
    expect(() => assertProductionPublisher(target, { ...publisher, ...override })).toThrow();
  });
  test('builds receive explicit public destinations and no deployment credentials', () => {
    const result = buildEnvironment(target, {
      PATH: '/bin',
      CLOUDFLARE_API_TOKEN: 'do-not-inherit',
      CONVEX_DEPLOY_KEY: 'do-not-inherit',
      CONVEX_DEPLOYMENT: 'dev:local',
      CONVEX_OVERRIDE_ACCESS_TOKEN: 'do-not-inherit',
      VITE_CONVEX_URL: 'http://localhost:3210'
    });
    expect(result.CLOUDFLARE_API_TOKEN).toBeUndefined();
    expect(result.CONVEX_DEPLOY_KEY).toBeUndefined();
    expect(result.CONVEX_OVERRIDE_ACCESS_TOKEN).toBeUndefined();
    expect(result.CONVEX_DEPLOYMENT).toBeUndefined();
    expect(result.VITE_CONVEX_URL).toBe(target.convexUrl);
    expect(result.VITE_CONVEX_SITE_URL).toBe(target.backendSiteUrl);
    expect(result.VITE_SITE_URL).toBe(target.appUrl);
    expect(result.WEB_BASE_PATH).toBe('/app/');
  });
});
