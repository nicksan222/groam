import { missingVariables } from '@groam/env/deployment';
import { env } from '@groam/env/production';
import { convex } from '#src/convex/cli';
import { environments, type ReleaseEnvironment } from '#src/environments';
import { releaseTarget, type ReleaseTarget } from '#src/release/target';
import { assertCommittedLocks } from '#src/void/lock';
import { workerSecretNames } from '#src/void/secrets';

/** A step that throws when something is missing; its message becomes the reported problem. */
export type Check = { name: string; run: () => void | Promise<void> };

function missing(where: string, names: string[]): void {
  if (names.length) throw new Error(`${where} is missing ${names.join(', ')}.`);
}

/** Runs every check and returns all problems at once, so one CI run lists everything to fix. */
export async function collectProblems(checks: Check[]): Promise<string[]> {
  const results = await Promise.allSettled(checks.map(async ({ run }) => run()));
  return results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${checks[index]?.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
        ]
      : []
  );
}

/**
 * Everything an environment needs before it can release, from @groam/env/deployment: the GitHub
 * environment's secrets, the Convex deployment's variables, and the web Worker's secrets, plus the
 * committed settings and locks. The release runs this first, and CI runs it before any deploy.
 */
export function preflightChecks(environment: ReleaseEnvironment): Check[] {
  let target: ReleaseTarget | null = null;
  let settingsError: unknown = null;
  try {
    target = releaseTarget(environment, environments[environment]);
  } catch (error) {
    settingsError = error;
  }
  const needsTarget = () => {
    if (!target) throw new Error('skipped until the environment settings are valid.');
    return target;
  };
  return [
    {
      name: 'Environment settings',
      run: () => {
        if (settingsError) throw settingsError;
      }
    },
    {
      name: 'GitHub environment secrets',
      run: () => missing('The GitHub environment', missingVariables('github', env.githubSecrets))
    },
    {
      name: 'Convex deploy key',
      run: () => {
        if (env.keyDeploymentName !== needsTarget().deploymentName)
          throw new Error(
            'CONVEX_DEPLOY_KEY is not a production key for the configured convexUrl.'
          );
      }
    },
    {
      name: 'Convex variables',
      run: () => {
        needsTarget();
        const names = new Set(convex(['env', 'list', '--prod', '--names-only']).split(/\s+/u));
        missing('The Convex deployment', missingVariables('convex', names));
      }
    },
    { name: 'Void locks', run: () => assertCommittedLocks(needsTarget()) },
    {
      name: 'Web Worker secrets',
      run: async () =>
        missing(
          'The web Worker',
          missingVariables('worker', await workerSecretNames(needsTarget()))
        )
    }
  ];
}

/** Throws with every problem when the environment is not ready to release. */
export async function assertPreflight(environment: ReleaseEnvironment): Promise<void> {
  const problems = await collectProblems(preflightChecks(environment));
  if (problems.length)
    throw new Error(
      `${environment} is not ready to release:\n${problems.map((p) => `  - ${p}`).join('\n')}\nRun \`bun run deploy:setup\` for how to fix each.`
    );
}

if (import.meta.main) {
  await assertPreflight(env.environment);
  console.log(`${env.environment} has everything it needs to release.`);
}
