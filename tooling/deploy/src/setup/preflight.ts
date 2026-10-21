import { missingVariables } from '@groam/env/deployment';
import { env } from '@groam/env/production';
import { convex } from '#src/convex/cli';
import { environments } from '#src/environments';
import { releaseTarget, type ReleaseTarget } from '#src/release/target';
import { assertCommittedLocks } from '#src/void/lock';
import { workerSecretNames } from '#src/void/secrets';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function missing(where: string, names: string[]): void {
  if (names.length) throw new Error(`${where} is missing ${names.join(', ')}.`);
}

/**
 * Everything an environment needs before it can release, all reported at once: the committed
 * settings first, then the variables and secrets in @groam/env/deployment and the Void locks.
 */
export async function preflightProblems(resolveTarget: () => ReleaseTarget): Promise<string[]> {
  let target: ReleaseTarget;
  try {
    target = resolveTarget();
  } catch (error) {
    return [`Environment settings: ${message(error)}`];
  }
  const problems: string[] = [];
  const check = async (name: string, run: () => unknown) => {
    try {
      await run();
    } catch (error) {
      problems.push(`${name}: ${message(error)}`);
    }
  };

  await check('GitHub environment secrets', () =>
    missing('The GitHub environment', missingVariables('github', env.githubSecrets))
  );
  const keyMatches = env.keyDeploymentName === target.deploymentName;
  await check('Convex deploy key', () => {
    if (!keyMatches)
      throw new Error('CONVEX_DEPLOY_KEY is not a production key for the configured convexUrl.');
  });
  // Without the right key, the Convex CLI would answer for another deployment.
  if (keyMatches)
    await check('Convex variables', () => {
      const names = new Set(convex(['env', 'list', '--prod', '--names-only']).split(/\s+/u));
      missing('The Convex deployment', missingVariables('convex', names));
    });
  await check('Void locks', () => assertCommittedLocks(target));
  if (env.cloudflareApiToken())
    await check('Web Worker secrets', async () =>
      missing('The web Worker', missingVariables('worker', await workerSecretNames(target)))
    );
  return problems;
}

function assertNoProblems(environment: string, problems: string[]): void {
  if (problems.length)
    throw new Error(
      `${environment} is not ready to release:\n${problems.map((p) => `  - ${p}`).join('\n')}\nRun \`bun run deploy:setup\` for how to fix each.`
    );
}

/** Throws with every problem when the release target is not ready to release. */
export async function assertPreflight(target: ReleaseTarget): Promise<void> {
  assertNoProblems(target.environment, await preflightProblems(() => target));
}

if (import.meta.main) {
  const { environment } = env;
  assertNoProblems(
    environment,
    await preflightProblems(() => releaseTarget(environment, environments[environment]))
  );
  console.log(`${environment} has everything it needs to release.`);
}
