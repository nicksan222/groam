import { describe, expect, test } from 'vitest';
import { assertLocalDevelopmentUrl } from './backend-session';

describe('assertLocalDevelopmentUrl', () => {
  test.each(['http://localhost:3210', 'http://127.0.0.1:3211', 'http://[::1]:3210'])(
    'allows local URL %s',
    (url) => expect(() => assertLocalDevelopmentUrl(url, 'URL')).not.toThrow()
  );

  test('refuses remote deployments', () => {
    expect(() => assertLocalDevelopmentUrl('https://example.convex.cloud', 'Convex URL')).toThrow(
      'Convex URL must target localhost'
    );
  });
});
