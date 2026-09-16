import { describe, expect, test } from 'vitest';
import { resolveAuthTrustedOrigins } from './origins';

describe('resolveAuthTrustedOrigins', () => {
  test('trusts every supported Vite loopback alias for local development', () => {
    expect(resolveAuthTrustedOrigins('http://127.0.0.1:3211', 'http://127.0.0.1:3211')).toEqual([
      'http://127.0.0.1:3211',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://[::1]:5173'
    ]);
  });

  test('keeps remote authentication restricted to its configured site origin', () => {
    expect(
      resolveAuthTrustedOrigins('https://app.groam.example/path', 'https://api.groam.dev')
    ).toEqual(['https://app.groam.example']);
  });
});
