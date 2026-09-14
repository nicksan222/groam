import { describe, expect, test } from 'vitest';
import { resolveConvexSiteUrl } from './convex-url';

describe('resolveConvexSiteUrl', () => {
  test('derives the Better Auth origin from a hosted Convex deployment', () => {
    expect(resolveConvexSiteUrl('https://bright-otter-123.convex.cloud')).toBe(
      'https://bright-otter-123.convex.site'
    );
  });

  test('uses an explicitly configured custom auth origin', () => {
    expect(
      resolveConvexSiteUrl('https://bright-otter-123.convex.cloud', 'https://auth.example.com/path')
    ).toBe('https://auth.example.com');
  });

  test.each([
    ['http://127.0.0.1:3210', 'http://127.0.0.1:3211'],
    ['http://localhost:4100', 'http://localhost:4101']
  ])('pairs local cloud origin %s with %s', (cloudUrl, expected) => {
    expect(resolveConvexSiteUrl(cloudUrl)).toBe(expected);
  });

  test.each(['https://convex.internal.example', 'http://localhost'])(
    'requires an explicit site URL for nonstandard deployment %s',
    (cloudUrl) => {
      expect(() => resolveConvexSiteUrl(cloudUrl)).toThrow('VITE_CONVEX_SITE_URL is required');
    }
  );
});
