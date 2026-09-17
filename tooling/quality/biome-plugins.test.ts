import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const biome = `${root}node_modules/.bin/biome`;

function lint(source: string, file = 'apps/web/src/features/example/example-view.tsx') {
  const temporary = mkdtempSync(join(tmpdir(), 'groam-biome-plugin-'));
  const fixture = join(temporary, file);
  mkdirSync(dirname(fixture), { recursive: true });
  writeFileSync(fixture, source);
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync(
      biome,
      ['lint', '--only=plugin', '--vcs-enabled=false', `--config-path=${root}`, fixture],
      { cwd: root, encoding: 'utf8' }
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }

  expect(result.error).toBe(undefined);
  const output = String(result.stdout) + String(result.stderr);
  expect(output.includes('errored:')).toBe(false);
  expect(output.includes('parse')).toBe(false);
  return { output, status: result.status };
}

describe('centralized test IDs', () => {
  test('rejects inline strings in production feature code', () => {
    for (const value of [
      '"save-trip"',
      "'save-trip'",
      '{"save-trip"}',
      "{'save-trip'}",
      '{`save-trip`}'
    ]) {
      const result = lint(`export const view = <button data-testid=${value}>Save</button>;`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Use testIds from @/lib/test-ids');
    }
  });

  test('allows shared and forwarded test IDs', () => {
    expect(
      lint('export const view = <Button data-testid={testIds.saveTrip}>Save</Button>;').status
    ).toBe(0);
    expect(lint('export const view = <Button data-testid={testId}>Save</Button>;').status).toBe(0);
    expect(
      lint(
        "export const view = <Button data-testid={'testId' in item ? item.testId : undefined}>Save</Button>;"
      ).status
    ).toBe(0);
  });

  test('allows local IDs in test fixtures and shared UI primitives', () => {
    expect(
      lint(
        'export const view = <button data-testid="fixture">Save</button>;',
        'apps/web/src/features/example/example-view.test.tsx'
      ).status
    ).toBe(0);
    expect(
      lint(
        'export const Button = () => <button data-testid="primitive" />;',
        'packages/ui/src/components/example.tsx'
      ).status
    ).toBe(0);
  });
});

describe('browser API boundaries', () => {
  test('rejects native blocking dialogs in feature code', () => {
    for (const call of [
      'window.alert("Saved")',
      'window.confirm("Continue?")',
      'window.prompt("Name")'
    ]) {
      const result = lint(
        `export function run() { return ${call}; }`,
        'apps/web/src/features/example/run.ts'
      );
      expect(result.status).toBe(1);
      expect(result.output).toContain('Use the app dialog abstraction');
    }
  });

  test('allows the dialog abstraction and its native fallback boundary', () => {
    expect(
      lint(
        'export function run(confirm) { return confirm("Continue?", "Review changes"); }',
        'apps/web/src/features/example/run.ts'
      ).status
    ).toBe(0);
    expect(
      lint(
        'export function fallback() { return window.confirm("Continue?"); }',
        'apps/web/src/features/workspace/workspace-shell/use-confirm-dialog.tsx'
      ).status
    ).toBe(0);
  });

  test('rejects direct local and session storage calls', () => {
    for (const call of [
      'localStorage.getItem("draft")',
      'window.localStorage.setItem("draft", value)',
      'sessionStorage.removeItem("draft")',
      'window.sessionStorage.clear()'
    ]) {
      const result = lint(
        `export function run(value) { return ${call}; }`,
        'apps/web/src/features/example/run.ts'
      );
      expect(result.status).toBe(1);
      expect(result.output).toContain('Access browser storage through a feature store');
    }
  });

  test('rejects passing a browser storage object across the feature boundary', () => {
    const result = lint(
      'export function run(adapter) { return adapter.persist(window.localStorage); }',
      'apps/web/src/features/example/run.ts'
    );
    expect(result.status).toBe(1);
    expect(result.output).toContain('Access browser storage through a feature store');
  });

  test('allows persistence adapters and storage setup in tests', () => {
    expect(
      lint(
        'export function run(store) { return store.getItem("draft"); }',
        'apps/web/src/features/example/run.ts'
      ).status
    ).toBe(0);
    expect(
      lint('localStorage.setItem("draft", "fixture");', 'apps/web/src/features/example/run.test.ts')
        .status
    ).toBe(0);
  });
});

describe('feature architecture boundaries', () => {
  test('uses shared UI primitives for interactive controls', () => {
    for (const tag of [
      '<button type="button">Save</button>',
      '<input aria-label="Name" />',
      '<select aria-label="Status" />',
      '<textarea aria-label="Notes" />'
    ]) {
      const result = lint(`export const view = ${tag};`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Use an exported @groam/ui component');
    }

    expect(
      lint(
        "import { Button } from '@groam/ui/components/button';\nexport const view = <Button>Save</Button>;"
      ).status
    ).toBe(0);
  });

  test('allows semantic containers without a design-system replacement', () => {
    expect(lint('export const view = <form><fieldset /></form>;').status).toBe(0);
  });

  test('keeps Convex React hooks in feature hook modules', () => {
    const source =
      "import { useQuery } from 'convex/react';\nexport function View() { return useQuery(api.example); }";
    const result = lint(source);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Move Convex React hooks into features/<domain>/hooks');

    expect(lint(source, 'apps/web/src/features/example/hooks/use-example.ts').status).toBe(0);
  });

  test('keeps fetch calls out of TSX components', () => {
    for (const call of ['fetch("/api/report")', 'window.fetch("/api/report")']) {
      const result = lint(`export async function View() { return ${call}; }`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Move network requests out of TSX components');
    }

    expect(
      lint(
        'export async function load() { return fetch("/api/report"); }',
        'apps/web/src/features/example/report-client.ts'
      ).status
    ).toBe(0);
  });

  test('keeps app notifications behind the shared UI facade', () => {
    const direct = lint(
      "import { toast } from 'sonner';\nexport const notify = () => toast.success('Saved');"
    );
    expect(direct.status).toBe(1);
    expect(direct.output).toContain('Import toast from @groam/ui/components/toast');

    expect(
      lint(
        "import { toast } from '@groam/ui/components/toast';\nexport const notify = () => toast.success('Saved');"
      ).status
    ).toBe(0);
  });

  test('uses router links for internal anchors', () => {
    const interpolation = ['$', '{tripId}'].join('');
    for (const href of ['"/trips"', "'/trips'", "{'/trips'}", `{\`/trips/${interpolation}\`}`]) {
      const result = lint(`export const view = <a href=${href}>Trips</a>;`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Use TanStack Router Link');
    }
  });

  test('allows external, fragment, and protocol-relative anchors', () => {
    for (const href of ['"https://groam.example"', '"#details"', '"//cdn.example/file"']) {
      expect(lint(`export const view = <a href=${href}>Open</a>;`).status).toBe(0);
    }
  });
});

describe('Playwright contract boundaries', () => {
  const spec = 'apps/web/e2e/example.spec.ts';
  const interpolation = ['$', '{tripId}'].join('');
  const idInterpolation = ['$', '{ids.dialog}'].join('');

  test('keeps browser test IDs in the shared contract', () => {
    for (const source of ["page.getByTestId('save-trip')", "by(page, 'save-trip')"]) {
      const result = lint(`${source};`, spec);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Use ids from @groam/app-actions/playwright');
    }

    expect(
      lint(
        `page.getByTestId(ids.saveTrip); by(page, ids.saveTrip); page.getByTestId(\`${idInterpolation}-submit\`);`,
        spec
      ).status
    ).toBe(0);
  });

  test('keeps internal browser navigation base-aware', () => {
    for (const source of ["page.goto('/trips');", `page.goto(\`/trips/${interpolation}\`);`]) {
      const result = lint(source, spec);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Wrap internal Playwright paths with appHref');
    }

    expect(lint("page.goto(appHref('trips'));", spec).status).toBe(0);
    expect(lint("page.goto('https://groam.example/trips');", spec).status).toBe(0);
  });
});
