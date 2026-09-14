import { describe, expect, test } from 'vitest';
import { isLocalConvexSiteUrl, isLocalDevelopmentUrl } from './local';

describe('local development URL guard', () => {
  test('accepts loopback HTTP URLs without credentials', () => {
    expect(isLocalDevelopmentUrl('http://127.0.0.1:5173/')).toBe(true);
    expect(isLocalDevelopmentUrl('http://localhost:3211')).toBe(true);
    expect(isLocalDevelopmentUrl('https://localhost')).toBe(true);
    expect(isLocalDevelopmentUrl('http://[::1]:3211')).toBe(true);
  });

  test('rejects hosted, credentialed, and malformed URLs', () => {
    expect(isLocalDevelopmentUrl(undefined)).toBe(false);
    expect(isLocalDevelopmentUrl('')).toBe(false);
    expect(isLocalDevelopmentUrl('https://happy-animal-123.convex.site')).toBe(false);
    expect(isLocalDevelopmentUrl('http://user:pass@localhost:5173')).toBe(false);
    expect(isLocalDevelopmentUrl('not a url')).toBe(false);
  });

  test('treats Convex site URL as local, not the Better Auth frontend origin', () => {
    expect(isLocalConvexSiteUrl(undefined)).toBe(true);
    expect(isLocalConvexSiteUrl('http://127.0.0.1:3211')).toBe(true);
    expect(isLocalConvexSiteUrl('https://happy-animal-123.convex.site')).toBe(false);
  });
});
