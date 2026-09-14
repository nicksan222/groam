import { env } from '@groam/env/convex-tooling';
import { type ConvexSpawner, type RunConvexOptions, runConvexOrExit } from './run-convex';

export const syncOptionalAiEnvironment = (
  configured: Record<string, string> = env.configuredConvexEnvironment,
  run: typeof runConvexOrExit = runConvexOrExit,
  spawn?: ConvexSpawner
) => {
  const convexEnvironment = Object.entries(configured)
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join('\n');

  if (!convexEnvironment) {
    return;
  }

  const options: RunConvexOptions = {
    input: `${convexEnvironment}\n`,
    stdio: ['pipe', 'inherit', 'inherit']
  };
  run(['env', 'set', '--force'], options, spawn);
};

if (import.meta.main) {
  syncOptionalAiEnvironment();
}
