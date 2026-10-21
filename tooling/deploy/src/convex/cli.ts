import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';

/** The backend deploy needs its deployment key, never the Cloudflare token or app secrets. */
export function backendEnvironment(inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(inherited).filter(
        ([key]) => !/^(?:CLOUDFLARE_|STRIPE_|BETTER_AUTH_|CONVEX_)/u.test(key)
      )
    ),
    CONVEX_DEPLOY_KEY: inherited.CONVEX_DEPLOY_KEY,
    CONVEX_AGENT_MODE: 'anonymous'
  };
}

/** Runs the Convex CLI against the deploy key's deployment. Values pass through stdin, never argv. */
export function convex(args: string[], options: { input?: string; stream?: boolean } = {}): string {
  return execFileSync(join(repoRoot, 'node_modules/.bin/convex'), args, {
    cwd: repoRoot,
    env: backendEnvironment(process.env),
    encoding: 'utf8',
    input: options.input,
    stdio: options.stream ? 'inherit' : ['pipe', 'pipe', 'inherit']
  });
}
