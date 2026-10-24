import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';

function lint(source: string, file = 'apps/web/src/features/layout-example.tsx') {
  return lintFixture(source, file);
}

describe('Shell layout guardrails', () => {
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

  test('allows documented composition, a conditional loading state and styled children', () => {
    expect(
      lint(`export const view = <Shell.TwoColumns aria-busy={loading}>
      <Shell.LeftColumn as="section">{loading ? <PageLoading /> : <div className="p-4">Report</div>}</Shell.LeftColumn>
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

  test('keeps the column geometry implementation inside packages/ui', () => {
    expect(
      lint(
        'export const view = <div className="grid xl:grid-cols-[minmax(0,1fr)_22rem]" />;',
        'packages/ui/src/components/example.tsx'
      ).status
    ).toBe(0);
  });
});

describe('Page canvas guardrails', () => {
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
});
