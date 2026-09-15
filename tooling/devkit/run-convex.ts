import { type SpawnSyncOptions, spawnSync } from 'node:child_process';
import { env } from '@groam/env/convex-tooling';
import { repoRoot } from './repo-root';

export type RunConvexOptions = {
  cwd?: string;
  encoding?: BufferEncoding;
  env?: NodeJS.ProcessEnv;
  input?: string;
  stdio?: SpawnSyncOptions['stdio'];
};

export type ConvexSpawnResult = {
  status: number | null;
  stderr?: string | Buffer | null;
  stdout?: string | Buffer | null;
};

export type ConvexSpawner = (
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions
) => ConvexSpawnResult;

export const runConvex = (
  args: readonly string[],
  options: RunConvexOptions = {},
  spawn: ConvexSpawner = spawnSync
) => {
  const result = spawn('bunx', ['convex', ...args], {
    cwd: options.cwd ?? repoRoot,
    encoding: options.encoding ?? 'utf8',
    env: {
      ...Bun.env,
      ...options.env,
      CONVEX_AGENT_MODE: env.convexAgentMode
    },
    input: options.input,
    stdio: options.stdio ?? 'pipe'
  });

  return {
    status: result.status,
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
    stdout: typeof result.stdout === 'string' ? result.stdout : ''
  };
};

export const runConvexOrExit = (
  args: readonly string[],
  options: RunConvexOptions = {},
  spawn: ConvexSpawner = spawnSync
) => {
  const result = runConvex(args, options, spawn);
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result;
};
