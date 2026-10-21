import { describe, expect, test } from 'vite-plus/test';
import { releaseTarget } from '#src/release/target';
import { productionSettings, productionTarget } from '#src/release/target-fixture';

describe('release target', () => {
  test('keeps the app, landing, and auth origins separate', () => {
    expect(productionTarget.siteUrl).toBe('https://app.groam.example');
    expect(productionTarget.landingUrl).toBe('https://groam.example');
    expect(productionTarget.backendSiteUrl).toBe('https://groam-demo.convex.site');
    expect(productionTarget.deploymentName).toBe('groam-demo');
    expect(productionTarget.workers).toEqual({ web: 'groam-app', landing: 'groam-landing' });
    expect(productionTarget.workersSubdomain).toBe('groam');
    expect(productionTarget.emailFrom).toBe('Groam <noreply@mail.groam.app>');
  });

  test('accepts regional origins without confusing the region with the deployment', () => {
    const regional = releaseTarget('production', {
      ...productionSettings,
      convexUrl: 'https://pastel-ocelot-555.eu-west-1.convex.cloud'
    });
    expect(regional.deploymentName).toBe('pastel-ocelot-555');
    expect(regional.backendSiteUrl).toBe('https://pastel-ocelot-555.eu-west-1.convex.site');
  });

  test.each([
    { convexUrl: '' },
    { convexUrl: 'https://groam-demo.convex.site' },
    { convexUrl: 'http://localhost:3210' },
    { convexUrl: 'https://groam-demo.convex.cloud?key=secret' },
    { convexUrl: 'https://user:password@groam-demo.convex.cloud' },
    { web: { worker: 'groam-app', host: 'groam-demo.convex.site' } },
    { web: { worker: 'groam-app', host: 'app.groam.example/app' } },
    { landing: { worker: 'groam-landing', host: 'app.groam.example' } },
    { cloudflareAccountId: 'not-an-account' },
    { workersSubdomain: '' },
    { workersSubdomain: 'https://groam.workers.dev' },
    { workersSubdomain: 'Groam Team' },
    { emailFrom: '' },
    { emailFrom: 'Groam <noreply@groam.localhost>' },
    { emailFrom: 'noreply' },
    { emailFrom: 'Groam <a@b>' },
    { emailFrom: 'x@mail.example' }
  ])('rejects an ambiguous or incomplete environment: %j', (override) => {
    expect(() => releaseTarget('production', { ...productionSettings, ...override })).toThrow();
  });
});
