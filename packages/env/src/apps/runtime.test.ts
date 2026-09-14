import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const runtimeKeys = [
  'CONVEX_AGENT_MODE',
  'GROAM_CONVEX_URL',
  'GROAM_DATA_DIR',
  'GROAM_REPLACE_CONVEX_DIR',
  'GROAM_SITE_ORIGIN',
  'GROAM_STARTUP_TIMEOUT_MS'
] as const;

const originalRuntimeValues = new Map(runtimeKeys.map((key) => [key, process.env[key]]));

const clearRuntimeValues = () => {
  for (const key of runtimeKeys) {
    delete process.env[key];
  }
};

describe('runtime env', () => {
  beforeEach(() => {
    clearRuntimeValues();
    vi.resetModules();
  });

  afterEach(() => {
    clearRuntimeValues();
    for (const key of runtimeKeys) {
      const value = originalRuntimeValues.get(key);
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
    vi.resetModules();
  });

  test('defaults to the local self-hosted Convex ports', async () => {
    const { env } = await import('./runtime');
    expect(env.convexUrl).toBe('http://127.0.0.1:3210');
    expect(env.siteUrl).toBe('http://127.0.0.1:3211');
    expect(env.convexAgentMode).toBe('anonymous');
    expect(env.dataDir).toBe('/data');
    expect(env.dataDirIsExplicit).toBe(false);
    expect(env.replaceConvexDir).toBe(false);
    expect(env.startupTimeoutMs).toBe(180_000);
  });

  test('accepts overrides from the environment', async () => {
    process.env.GROAM_CONVEX_URL = 'http://127.0.0.1:4321';
    process.env.GROAM_SITE_ORIGIN = 'http://127.0.0.1:4322/';
    process.env.GROAM_DATA_DIR = '/tmp/groam-data';
    process.env.GROAM_REPLACE_CONVEX_DIR = '1';
    process.env.GROAM_STARTUP_TIMEOUT_MS = '60000';
    process.env.CONVEX_AGENT_MODE = 'anonymous';

    const { env } = await import('./runtime');
    expect(env.convexUrl).toBe('http://127.0.0.1:4321');
    expect(env.siteUrl).toBe('http://127.0.0.1:4322');
    expect(env.dataDir).toBe('/tmp/groam-data');
    expect(env.dataDirIsExplicit).toBe(true);
    expect(env.replaceConvexDir).toBe(true);
    expect(env.startupTimeoutMs).toBe(60_000);
  });
});
