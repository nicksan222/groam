import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const biome = `${root}node_modules/.bin/biome`;

function lint(source: string, file = 'apps/web/src/features/layout-example.tsx') {
  const temporary = mkdtempSync(join(tmpdir(), 'groam-shell-lint-'));
  const fixture = join(temporary, file);
  mkdirSync(dirname(fixture), { recursive: true });
  writeFileSync(fixture, source);
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync(
      biome,
      ['lint', '--only=plugin', '--vcs-enabled=false', `--config-path=${root}`, fixture],
      {
        cwd: root,
        encoding: 'utf8'
      }
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

describe('Biome Shell layout guardrails', () => {
  for (const name of ['Split', 'Split.Main', 'Split.Aside', 'SplitMain', 'SplitAside']) {
    test(`rejects legacy Shell.${name} in feature code`, () => {
      const result = lint(`export const view = <Shell.${name} />;`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('legacy split API');
    });
  }

  for (const name of ['TwoColumns', 'LeftColumn', 'RightColumn', 'DesktopRightColumn']) {
    test(`protects Shell.${name} geometry`, () => {
      for (const props of [
        'rightWidth="sm"',
        'gap="md"',
        'breakpoint="lg"',
        'stack="page"',
        'sticky="far"',
        'order="first"',
        'mobileDivider',
        'className="grid"',
        'className={classes}',
        'style={{ width: 500 }}',
        '{...props}'
      ]) {
        const result = lint(`export const view = <Shell.${name} ${props}>Content</Shell.${name}>;`);
        expect(result.status).toBe(1);
        expect(result.output).toContain('Do not override the scaffold');
      }
    });
  }

  for (const classes of [
    '"grid lg:grid-cols-[minmax(0,1fr)_320px]"',
    '{cn("grid", active && "xl:grid-cols-[minmax(0,1fr)_22rem]")}'
  ]) {
    test(`rejects handwritten primary/sidebar geometry: ${classes}`, () => {
      const result = lint(`export const view = <div className=${classes} />;`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('primary/supporting page layouts');
    });
  }

  test('allows documented composition, conditional skeletons and styled children', () => {
    expect(
      lint(`export const view = <Shell.TwoColumns aria-busy={loading}>
      <Shell.LeftColumn as="section">{loading ? <Skeleton /> : <div className="p-4">Report</div>}</Shell.LeftColumn>
      <Shell.RightColumn aria-label="Details">Details</Shell.RightColumn>
    </Shell.TwoColumns>;`).status
    ).toBe(0);
  });

  test('allows content grids and comparison tables', () => {
    expect(
      lint(
        `export const view = <><div className="grid grid-cols-[auto_minmax(0,1fr)]" /><div className="sm:grid-cols-[minmax(6rem,0.6fr)_minmax(0,1fr)_minmax(0,1fr)]" /></>;`
      ).status
    ).toBe(0);
  });

  test('keeps geometry implementation and compatibility adapters inside packages/ui', () => {
    expect(
      lint(
        'export const view = <Shell.Split className="custom" />;',
        'packages/ui/src/components/example.tsx'
      ).status
    ).toBe(0);
  });
});

describe('Biome page canvas guardrails', () => {
  const owner = 'apps/web/src/features/trips/trip-detail/trip-page-shell.tsx';

  test('keeps the planning page body on shared defaults', () => {
    for (const props of [
      'variant="section"',
      'innerInset',
      'maxWidthClassName="max-w-xl"',
      'className="bg-background"',
      'style={{ padding: 40 }}',
      '{...props}'
    ]) {
      const result = lint(
        `export const view = <Shell.PageBody ${props}>Content</Shell.PageBody>;`,
        owner
      );
      expect(result.status).toBe(1);
      expect(result.output).toContain('Remove layout overrides');
    }
    expect(
      lint(
        'export const view = <Shell.PageBody aria-label="Trip"><div className="p-4">Content</div></Shell.PageBody>;',
        owner
      ).status
    ).toBe(0);
  });

  test('rejects extra page bodies in both trip and idea content', () => {
    for (const file of [
      'apps/web/src/features/trips/trip-itinerary/view.tsx',
      'apps/web/src/features/ideas/idea-changes/view.tsx'
    ]) {
      for (const body of ['<Shell.PageBody />', '<Shell.PageBody>Content</Shell.PageBody>']) {
        const result = lint(`export const view = ${body};`, file);
        expect(result.status).toBe(1);
        expect(result.output).toContain('TripPageShell already provides');
      }
      expect(
        lint(
          'export const view = <Shell.Section><div className="p-4">Content</div></Shell.Section>;',
          file
        ).status
      ).toBe(0);
    }
  });

  test('allows page-body variants in other page families and UI implementations', () => {
    for (const file of [
      'apps/web/src/features/settings/settings-view.tsx',
      'packages/ui/src/components/example.tsx'
    ]) {
      expect(lint('export const view = <Shell.PageBody variant="compact" />;', file).status).toBe(
        0
      );
    }
  });

  test('requires component scope on descendant variant selectors', () => {
    for (const file of [
      'packages/ui/src/components/example.tsx',
      'apps/web/src/features/layout-example.tsx'
    ]) {
      for (const classes of [
        '"has-data-[variant=inset]:bg-sidebar"',
        '{cn("flex", active && "has-data-[variant=inset]:bg-sidebar")}'
      ]) {
        const result = lint(`export const view = <div className=${classes} />;`, file);
        expect(result.status).toBe(1);
        expect(result.output).toContain('Scope descendant variant selectors');
      }
      expect(
        lint(
          `export const view = <div className="has-[[data-slot=sidebar][data-variant=inset]]:bg-sidebar group-data-[variant=inset]:m-2 group-has-data-[variant=ghost]/message:px-0" />;`,
          file
        ).status
      ).toBe(0);
    }
  });
});
