import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';

const feature = 'apps/web/src/features/other/create-issue.tsx';
const hook = 'apps/web/src/features/issues/hooks/use-workspace-issues.ts';
const hookModule = '@/features/issues/hooks/use-workspace-issues';
const reports = (source: string, file = feature) =>
  lintFixture(source, file, 'no-duplicate-issue-form').status === 1;

describe('groam/no-duplicate-issue-form', () => {
  test('rejects importing or forwarding the creation hook from another screen', () => {
    for (const source of [
      `import { useCreateIssue } from '${hookModule}';`,
      `import { useCreateIssue as create } from '${hookModule}';`,
      `import * as issues from '${hookModule}';`,
      `export { useCreateIssue } from '${hookModule}';`,
      `export * from '${hookModule}';`,
      `import { useCreateIssue } from '../issues/hooks/use-workspace-issues';`
    ])
      expect(reports(source)).toBe(true);
  });

  test('allows the existing form owners and consumers of the shared dialog', () => {
    for (const file of [
      'apps/web/src/features/issues/shared/create-issue-dialog.tsx',
      'apps/web/src/features/trip-queue/queue-add-row.tsx'
    ])
      expect(reports(`import { useCreateIssue } from '${hookModule}';`, file)).toBe(false);
    expect(
      reports(`import { CreateIssueDialog } from '@/features/issues/shared/create-issue-dialog';`)
    ).toBe(false);
  });

  test('rejects bypassing the hook through the direct endpoint, including API aliases', () => {
    for (const source of [
      `import { api } from '@groam/backend/api'; const create = api.routes.trips.issues.create.run;`,
      `import { api as backend } from '@groam/backend/api'; const create = backend.routes.trips.issues.create.run;`,
      `import * as backend from '@groam/backend/api'; const create = backend.api.routes.trips.issues.create.run;`,
      `import { api } from '@groam/backend/api'; const create = api['routes'].trips.issues['create'].run;`
    ]) {
      expect(reports(source)).toBe(true);
      expect(reports(source, hook)).toBe(false);
      expect(reports(source, 'apps/web/src/features/issues/shared/create-issue-dialog.tsx')).toBe(
        true
      );
    }
  });

  test('allows other endpoints, test fixtures, and backend callers', () => {
    expect(
      reports(
        `import { api } from '@groam/backend/api'; const read = api.routes.trips.issues.list.run;`
      )
    ).toBe(false);
    const source = `import { useCreateIssue } from '${hookModule}';`;
    expect(reports(source, 'apps/web/src/features/other/create-issue.test.tsx')).toBe(false);
    expect(reports(source, 'apps/web/src/features/other/create-issue.spec.tsx')).toBe(false);
    expect(reports(source, 'tooling/app-actions/src/backend/create-issue.ts')).toBe(false);
  });

  test('resolves hoisted imports and ignores shadowed API names', () => {
    expect(
      reports(`function create() { return api.routes.trips.issues.create.run; }
import { api } from '@groam/backend/api';`)
    ).toBe(true);
    expect(
      reports(`import { api } from '@groam/backend/api';
function unrelated(api) { return api.routes.trips.issues.create.run; }`)
    ).toBe(false);
  });
});
