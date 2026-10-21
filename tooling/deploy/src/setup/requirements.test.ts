import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '@groam/devkit/repo-root';
import { expect, test } from 'vite-plus/test';
import { status, type Facts } from '#src/setup/checklist';
import {
  githubEnvironments,
  releaseSwitches,
  requirements,
  type Requirement
} from '#src/setup/requirements';

const workflow = readFileSync(join(repoRoot, '.github/workflows/release.yml'), 'utf8');

test.each(['production', 'beta'] as const)(
  'the release workflow uses exactly the %s settings the checklist asks for',
  (environment) => {
    const listed = requirements(environment);
    for (const { name } of listed.filter((r) => r.location === 'GitHub environment secret'))
      expect(workflow).toContain(`secrets.${name}`);
    for (const secret of workflow.matchAll(/secrets\.([A-Z_]+)/gu))
      expect(listed.map(({ name }) => name)).toContain(secret[1]);
    expect(workflow).toContain(`name: ${githubEnvironments[environment]}`);
    expect(workflow).toContain(`vars.${releaseSwitches[environment]} == 'true'`);
  }
);

const facts: Facts = {
  configError: null,
  convexUrl: '',
  hosts: true,
  workersSubdomain: false,
  locks: false,
  githubSecrets: new Set(['CONVEX_DEPLOY_KEY']),
  githubVariables: null
};
const find = (name: string): Requirement => {
  const requirement = requirements('production').find((r) => r.name === name);
  if (!requirement) throw new Error(`No requirement ${name}`);
  return requirement;
};

test('marks what this machine can check and leaves the rest to the release', () => {
  expect(status(find('convexUrl'), facts)).toBe('missing');
  expect(status(find('web.host, landing.host'), facts)).toBe('done');
  expect(status(find('CONVEX_DEPLOY_KEY'), facts)).toBe('done');
  expect(status(find('CLOUDFLARE_API_TOKEN'), facts)).toBe('missing');
  expect(status(find('CONVEX_PRODUCTION_ENABLED'), facts)).toBe('unchecked');
  expect(status(find('SITE_URL'), facts)).toBe('automatic');
  expect(status(find('Workers Scripts: Edit'), facts)).toBe('unchecked');
  expect(status(find('workersSubdomain'), facts)).toBe('missing');
});
