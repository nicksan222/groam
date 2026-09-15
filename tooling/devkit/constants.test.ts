import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { constantValues, localOrigins, localPorts, toolchain } from './constants';
import { repoRoot } from './repo-root';

describe('toolchain pins', () => {
  test('reads Bun from packageManager and Node from convex.json', () => {
    const workspacePackage = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      packageManager: string;
    };
    const convexConfig = JSON.parse(readFileSync(join(repoRoot, 'convex.json'), 'utf8')) as {
      node: { nodeVersion: string };
    };

    expect(toolchain.bunVersion).toBe(workspacePackage.packageManager.replace(/^bun@/u, ''));
    expect(toolchain.nodeMajor).toBe(Number(convexConfig.node.nodeVersion));
    expect(constantValues.bunVersion).toBe(toolchain.bunVersion);
    expect(constantValues.nodeMajor).toBe(String(toolchain.nodeMajor));
  });
});

describe('local ports', () => {
  test('exposes the Groam local stack ports and origins', () => {
    expect(localPorts).toEqual({
      convexApi: 3210,
      convexSite: 3211,
      dashboard: 6790,
      web: 5173
    });
    expect(localOrigins.convexApi).toBe('http://127.0.0.1:3210');
    expect(localOrigins.convexSite).toBe('http://127.0.0.1:3211');
    expect(localOrigins.vite).toBe('http://localhost:5173');
    expect(localOrigins.viteLoopback).toBe('http://127.0.0.1:5173');
    expect(localOrigins.dashboard).toBe('http://127.0.0.1:6790');
  });
});
