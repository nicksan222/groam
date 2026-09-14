import { describe, expect, test } from 'bun:test';
import type { SpawnSyncOptions } from 'node:child_process';
import { repoRoot } from './repo-root';
import { runConvex } from './run-convex';

describe('runConvex', () => {
  test('spawns bunx convex from the repo root with anonymous agent mode', () => {
    let command = '';
    let args: readonly string[] = [];
    let options: SpawnSyncOptions = {};

    const result = runConvex(['env', 'list'], {}, (nextCommand, nextArgs, nextOptions) => {
      command = nextCommand;
      args = nextArgs;
      options = nextOptions;
      return { status: 0, stderr: '', stdout: 'SITE_URL\n' };
    });

    expect(command).toBe('bunx');
    expect(args).toEqual(['convex', 'env', 'list']);
    expect(options.cwd).toBe(repoRoot);
    expect(options.env?.CONVEX_AGENT_MODE).toBe('anonymous');
    expect(result).toEqual({ status: 0, stderr: '', stdout: 'SITE_URL\n' });
  });

  test('does not let callers bypass the validated agent mode', () => {
    let agentMode = '';

    runConvex(['dev'], { env: { CONVEX_AGENT_MODE: 'logged-in' } }, (_command, _args, options) => {
      agentMode = String(options.env?.CONVEX_AGENT_MODE ?? '');
      return { status: 0, stderr: '', stdout: '' };
    });

    expect(agentMode).toBe('anonymous');
  });
});
