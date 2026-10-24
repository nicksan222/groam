import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vite-plus/test';
import { z } from 'zod';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const environments = read('tooling/deploy/environments.json') as Record<
  'beta' | 'production',
  Record<string, unknown> & Record<'web' | 'landing', Record<string, unknown>>
>;
const schema = z.fromJSONSchema(
  read('tooling/deploy/environments.schema.json') as Parameters<typeof z.fromJSONSchema>[0]
);

/** The committed settings with one change applied to beta. */
function withBeta(change: (beta: (typeof environments)['beta']) => void): unknown {
  const copy = structuredClone(environments);
  change(copy.beta);
  return copy;
}

describe('release environments', () => {
  test('the committed settings match their JSON schema', () => {
    expect(schema.safeParse(environments).error).toBeUndefined();
  });

  test.each<[string, (beta: (typeof environments)['beta']) => void]>([
    [
      'a regional Convex URL',
      (beta) => (beta.convexUrl = 'https://pastel-ocelot-555.eu-west-1.convex.cloud')
    ],
    ['a workers.dev subdomain', (beta) => (beta.workersSubdomain = 'groam-beta.workers.dev')],
    ['a bare sender address', (beta) => (beta.emailFrom = 'noreply@beta.groam.app')]
  ])('accepts %s', (_, change) => {
    expect(schema.safeParse(withBeta(change)).success).toBe(true);
  });

  test.each<[string, (beta: (typeof environments)['beta']) => void]>([
    ['a local Convex URL', (beta) => (beta.convexUrl = 'http://localhost:3210')],
    ['a Convex site URL', (beta) => (beta.convexUrl = 'https://groam-beta.convex.site')],
    ['a malformed account', (beta) => (beta.cloudflareAccountId = 'not-an-account')],
    ['a URL as subdomain', (beta) => (beta.workersSubdomain = 'https://groam.workers.dev')],
    ['an unreachable sender', (beta) => (beta.emailFrom = 'Groam <noreply@groam.localhost>')],
    ['an example sender', (beta) => (beta.emailFrom = 'x@mail.example')],
    ['a sender without a domain', (beta) => (beta.emailFrom = 'noreply')],
    ['a Convex host for the web app', (beta) => (beta.web.host = 'groam-beta.convex.site')],
    ['a host with a path', (beta) => (beta.web.host = 'app.groam.example/app')],
    ['an invalid Worker name', (beta) => (beta.landing.worker = 'Groam Landing')],
    ['a missing frontend', (beta) => Reflect.deleteProperty(beta, 'landing')],
    ['an unknown setting', (beta) => (beta.siteUrl = 'https://app.groam.app')]
  ])('rejects %s', (_, change) => {
    expect(schema.safeParse(withBeta(change)).success).toBe(false);
  });
});
