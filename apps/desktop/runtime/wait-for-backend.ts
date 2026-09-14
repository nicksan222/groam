import { existsSync } from 'node:fs';
import {
  isConvexBackendResponding,
  waitForBackend as waitForConvexBackend
} from '@groam/devkit/wait-for-backend';
import { runtimeEnv } from './env';

export const isBackendResponding = isConvexBackendResponding;

export const canRunConvexSmoke = async (
  envPath = '.env.local',
  spawnConvex = (command: string[], options: { stderr: 'pipe'; stdout: 'pipe' }) =>
    Bun.spawn(command, options).exited
) => {
  if (!existsSync(envPath)) {
    return false;
  }

  try {
    const result = await spawnConvex(
      ['bunx', 'convex', 'run', '--component', 'web', 'lib:getUrls', '{}'],
      {
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );

    return result === 0;
  } catch {
    return false;
  }
};

export const waitForBackend = async (
  backendUrl = runtimeEnv.convexUrl,
  options: {
    canRunSmoke?: typeof canRunConvexSmoke;
    fetchBackend?: typeof fetch;
    now?: () => number;
    sleep?: (milliseconds: number) => Promise<unknown>;
    timeoutMs?: number;
  } = {}
) => {
  const canRunSmoke = options.canRunSmoke ?? canRunConvexSmoke;

  await waitForConvexBackend(backendUrl, {
    extraReady: () => canRunSmoke(),
    fetchBackend: options.fetchBackend,
    now: options.now,
    sleep: options.sleep,
    timeoutMs: options.timeoutMs ?? runtimeEnv.startupTimeoutMs
  });
};
