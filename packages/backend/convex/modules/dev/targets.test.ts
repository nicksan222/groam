import { describe, expect, test } from 'vitest';
import { assertLocalDevelopmentReset } from './targets';

describe('assertLocalDevelopmentReset', () => {
  test.each(['http://localhost:3211', 'http://127.0.0.1:3211', 'http://[::1]:3211'])(
    'allows local site URL %s',
    (url) => expect(() => assertLocalDevelopmentReset(url)).not.toThrow()
  );

  test('refuses a missing site URL', () => {
    expect(() => assertLocalDevelopmentReset(undefined)).toThrow(
      'Local reset requires CONVEX_SITE_URL or SITE_URL'
    );
  });

  test('refuses a hosted Convex deployment', () => {
    expect(() => assertLocalDevelopmentReset('https://happy-animal-123.convex.site')).toThrow(
      'refusing a remote Convex deployment'
    );
  });
});
