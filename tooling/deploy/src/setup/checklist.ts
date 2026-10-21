import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import { environments, type ReleaseEnvironment } from '#src/environments';
import { releaseTarget } from '#src/release/target';
import {
  githubEnvironments,
  releaseSwitches,
  requirements,
  type Location,
  type Requirement
} from '#src/setup/requirements';
import { frontendApps, lockPath } from '#src/void/lock';

/** What this machine can see; anything else is left for the release to check. */
export type Facts = {
  configError: string | null;
  convexUrl: string;
  hosts: boolean;
  workersSubdomain: boolean;
  emailFrom: boolean;
  locks: boolean;
  githubSecrets: ReadonlySet<string> | null;
  githubVariables: ReadonlyMap<string, string> | null;
};

export type Status = 'done' | 'missing' | 'unchecked' | 'automatic';

type Check = (requirement: Requirement, facts: Facts) => boolean | null;

/** How this machine can tell whether a value is in place, by where it lives. */
const checks: Partial<Record<Location, Check>> = {
  'tooling/deploy/src/environments.ts': ({ name }, facts) => {
    if (name === 'convexUrl') return Boolean(facts.convexUrl);
    if (name === 'workersSubdomain') return facts.workersSubdomain;
    if (name === 'emailFrom') return facts.emailFrom;
    return name.includes('host') ? facts.hosts : null;
  },
  'tooling/deploy/locks': (_, facts) => facts.locks,
  'GitHub environment secret': ({ name }, facts) => facts.githubSecrets?.has(name) ?? null,
  'GitHub repository variable': ({ name }, facts) =>
    facts.githubVariables ? facts.githubVariables.get(name) === 'true' : null
};

export function status(requirement: Requirement, facts: Facts): Status {
  if (requirement.setBy === 'release') return 'automatic';
  const result = checks[requirement.location]?.(requirement, facts) ?? null;
  if (result === null) return 'unchecked';
  return result ? 'done' : 'missing';
}

/** Name → value pairs from `gh … list --json name[,value]`; null when gh can't tell us. */
function ghList(args: string[]): Map<string, string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      execFileSync('gh', args, { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' })
    );
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const entries = new Map<string, string>();
  for (const item of parsed as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const { name, value } = item as { name?: unknown; value?: unknown };
    if (typeof name === 'string') entries.set(name, typeof value === 'string' ? value : '');
  }
  return entries;
}

function gatherFacts(environment: ReleaseEnvironment): Facts {
  const settings = environments[environment];
  let configError: string | null = null;
  try {
    releaseTarget(environment, settings);
  } catch (error) {
    configError = error instanceof Error ? error.message : String(error);
  }
  const secrets = ghList([
    'secret',
    'list',
    '--env',
    githubEnvironments[environment],
    '--json',
    'name'
  ]);
  const variables = ghList(['variable', 'list', '--json', 'name,value']);
  return {
    configError,
    convexUrl: settings.convexUrl,
    hosts: Boolean(settings.web.host && settings.landing.host),
    workersSubdomain: Boolean(settings.workersSubdomain),
    emailFrom: Boolean(settings.emailFrom),
    locks: frontendApps.every((app) => existsSync(join(repoRoot, lockPath(environment, app)))),
    githubSecrets: secrets ? new Set(secrets.keys()) : null,
    githubVariables: variables
  };
}

const marks: Record<Status, string> = { done: '✓', missing: '✗', unchecked: '·', automatic: '↻' };

if (import.meta.main) {
  for (const environment of Object.keys(environments) as ReleaseEnvironment[]) {
    const facts = gatherFacts(environment);
    console.log(`\n${environment} (GitHub environment "${githubEnvironments[environment]}")`);
    let location = '';
    for (const requirement of requirements(environment)) {
      if (requirement.location !== location) {
        location = requirement.location;
        console.log(`  ${location}`);
      }
      const optional = requirement.optional ? ' (optional)' : '';
      console.log(`    ${marks[status(requirement, facts)]} ${requirement.name}${optional}`);
      // Show how to do everything that is not confirmed done or handled by the release.
      if (['missing', 'unchecked'].includes(status(requirement, facts)))
        console.log(`        ${requirement.how}`);
    }
    // Field-level gaps are listed above; this catches values that are filled in but invalid.
    if (
      facts.configError &&
      facts.convexUrl &&
      facts.hosts &&
      facts.workersSubdomain &&
      facts.emailFrom
    )
      console.log(`  Config: ${facts.configError}`);
    if (!facts.githubSecrets)
      console.log('  GitHub not checked: run `gh auth login` to include it.');
    console.log(
      `  Releases ${facts.githubVariables?.get(releaseSwitches[environment]) === 'true' ? 'are on' : 'are off'}.`
    );
  }
  console.log(
    '\n✓ done  ✗ missing  ↻ set by every release  · not visible from here (see requirements.ts)'
  );
}
