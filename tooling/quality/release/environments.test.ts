import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vite-plus/test';
import { z } from 'zod';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const environments = read('tooling/deploy/environments.json') as Record<
  'production',
  Record<string, unknown>
>;
const schema = z.fromJSONSchema(
  read('tooling/deploy/environments.schema.json') as Parameters<typeof z.fromJSONSchema>[0]
);

/** The committed settings with one change applied to production. */
function withProduction(
  change: (production: (typeof environments)['production']) => void
): unknown {
  const copy = structuredClone(environments);
  change(copy.production);
  return copy;
}

describe('release environments', () => {
  test('the committed settings match their JSON schema', () => {
    expect(schema.safeParse(environments).error).toBeUndefined();
  });

  test.each<[string, (production: (typeof environments)['production']) => void]>([
    [
      'a regional Convex URL',
      (production) => (production.convexUrl = 'https://pastel-ocelot-555.eu-west-1.convex.cloud')
    ],
    [
      'an unconfigured host, served from the deployment origin',
      (production) => (production.host = '')
    ],
    ['a custom domain', (production) => (production.host = 'groam.app')],
    ['a bare sender address', (production) => (production.emailFrom = 'noreply@groam.app')]
  ])('accepts %s', (_, change) => {
    expect(schema.safeParse(withProduction(change)).success).toBe(true);
  });

  test.each<[string, (production: (typeof environments)['production']) => void]>([
    ['a local Convex URL', (production) => (production.convexUrl = 'http://localhost:3210')],
    [
      'a Convex site URL',
      (production) => (production.convexUrl = 'https://groam-production.convex.site')
    ],
    [
      'an unreachable sender',
      (production) => (production.emailFrom = 'Groam <noreply@groam.localhost>')
    ],
    ['an example sender', (production) => (production.emailFrom = 'x@mail.example')],
    ['a sender without a domain', (production) => (production.emailFrom = 'noreply')],
    ['a Convex host', (production) => (production.host = 'groam-production.convex.site')],
    ['a host with a path', (production) => (production.host = 'groam.example/app')],
    ['a missing host', (production) => Reflect.deleteProperty(production, 'host')],
    ['a separate web host', (production) => (production.web = { host: 'app.groam.app' })],
    ['an unknown setting', (production) => (production.siteUrl = 'https://app.groam.app')]
  ])('rejects %s', (_, change) => {
    expect(schema.safeParse(withProduction(change)).success).toBe(false);
  });
});
