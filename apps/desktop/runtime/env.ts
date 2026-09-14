import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '@groam/env/runtime';

const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));

export const runtimeEnv = {
  ...env,
  projectRoot
} as const;

export const resolveDataConvexPath = (dataDir: string) => path.join(dataDir, '.convex');
