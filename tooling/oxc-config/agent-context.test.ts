import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';

const lint = (rule: string, source: string, file: string) =>
  lintFixture(source, file, `groam(${rule})`);

describe('groam/page-renders-view', () => {
  const rule = 'page-renders-view';
  const page = 'apps/web/pages/(workspace)/example.tsx';
  const view = `import { ExampleView } from '@/features/example/example-view';\n`;

  test('allows a View re-export, a rendered View, a View in a wrapper, and a pure redirect', () => {
    for (const source of [
      `export { InboxView as default } from '@/features/inbox/inbox-view';`,
      `${view}import { Navigate } from '@/lib/navigation/router';
export default function Page({ ok }: { ok: boolean }) {
  if (!ok) return <Navigate to="/" />;
  return <ExampleView />;
}`,
      `import { ThreadView } from '@/features/discussions/discussion-thread/discussion-thread-view';
const Page = () => <Redirect><ThreadView /></Redirect>;
export default Page;`,
      `import { Navigate } from '@/lib/navigation/router';\nexport default () => <Navigate to="/" />;`
    ]) {
      expect(lint(rule, source, page).status).toBe(0);
    }
  });

  test('reports pages that render no View', () => {
    for (const source of [
      `export default function Page() { return null; }`,
      `export default function Page() { return <ChatEmptyPane />; }`,
      `export { RouteNotFound as default } from '@/features/errors/route-error/route-not-found';`,
      `export { Foo as BarView } from '@/features/x/x-view';\nexport const value = 1;`,
      `import { Foo as BarView } from '@/features/x/x-view';
export default function Page() { return <BarView />; }`,
      `export const value = 1;`,
      `const Navigate = () => null;
export default () => <Navigate />;`,
      `import { AView } from '@/features/a/a-view';
import { BView } from '@/features/b/b-view';
export default function Page() { return <><AView /><BView /></>; }`
    ]) {
      const result = lint(rule, source, page);
      expect(result.status).toBe(1);
      expect(result.output).toContain('register-agent-screen-context');
    }
  });

  test('ignores layouts and tests', () => {
    const source = `export default function Layout() { return null; }`;
    expect(lint(rule, source, 'apps/web/pages/(workspace)/layout.tsx').status).toBe(0);
    expect(lint(rule, source, 'apps/web/pages/(workspace)/example.test.tsx').status).toBe(0);
  });
});

describe('groam/view-registers-agent-context', () => {
  const rule = 'view-registers-agent-context';
  const file = 'apps/web/src/features/example/example-view.tsx';

  test('allows one registration in each export form', () => {
    for (const source of [
      `export function ExampleView() { useSetAgentContext({}); return null; }`,
      `export const ExampleView = () => { useExampleAgentContext(); return null; };`,
      `function ExampleView() { useSetAgentContext({}); return null; }\nexport { ExampleView };`,
      `export function ExampleView() { return <Gate><Inner /></Gate>; }
function Inner() { useSetAgentContext({}); return null; }`
    ]) {
      expect(lint(rule, source, file).status).toBe(0);
    }
  });

  test('reports a missing registration, useCurrentAgentContext, and a nested callback', () => {
    for (const source of [
      `export function ExampleView() { return null; }`,
      `export function ExampleView() { useCurrentAgentContext(); return null; }`,
      `export function ExampleView() { useEffect(() => { useSetAgentContext({}); }); return null; }`
    ]) {
      const result = lint(rule, source, file);
      expect(result.status).toBe(1);
      expect(result.output).toContain('exactly once');
    }
  });

  test('reports two registrations in the file', () => {
    for (const source of [
      `export function ExampleView() { useSetAgentContext({}); useExampleAgentContext(); return null; }`,
      `export function ExampleView() { useSetAgentContext({}); return <Inner />; }
function Inner() { useSetAgentContext({}); return null; }`
    ]) {
      const result = lint(rule, source, file);
      expect(result.status).toBe(1);
      expect(result.output).toContain('one context per screen');
    }
  });

  test('reports a file with no exported View', () => {
    for (const source of [
      `export function Panel() { useSetAgentContext({}); return null; }`,
      `function ExampleView() { useSetAgentContext({}); return null; }`
    ]) {
      const result = lint(rule, source, file);
      expect(result.status).toBe(1);
      expect(result.output).toContain('export its *View component');
    }
  });

  test('ignores tests', () => {
    const source = `export function Helper() { return null; }`;
    expect(lint(rule, source, 'apps/web/src/features/example/example-view.test.tsx').status).toBe(
      0
    );
  });
});

describe('groam/agent-context-owner', () => {
  const rule = 'agent-context-owner';
  const viewFile = 'apps/web/src/features/example/example-view.tsx';
  const otherFile = 'apps/web/src/features/example/example-panel.tsx';

  test('allows a registration in a local view component', () => {
    const source = `export function ExampleView() { return <Inner />; }
function Inner() { useSetAgentContext({}); return null; }`;
    expect(lint(rule, source, viewFile).status).toBe(0);
  });

  test('allows a registration in the exported View or in a context hook', () => {
    expect(
      lint(rule, `export function ExampleView() { useSetAgentContext({}); return null; }`, viewFile)
        .status
    ).toBe(0);
    expect(
      lint(
        rule,
        `export function useExampleAgentContext() { useSetAgentContext({}); }`,
        'apps/web/src/features/example/use-example-agent-context.ts'
      ).status
    ).toBe(0);
  });

  test('reports registrations outside the View and context hooks', () => {
    for (const [source, file] of [
      [`export function Panel() { useSetAgentContext({}); return null; }`, otherFile],
      [`export function useDashboard() { useExampleAgentContext(); }`, otherFile],
      [`useSetAgentContext({});`, otherFile],
      [
        `export function ExampleView() { useEffect(() => { useSetAgentContext({}); }); return null; }`,
        viewFile
      ],
      [
        `function Helper() { useSetAgentContext({}); return null; }\nexport function ExampleView() { return <Helper />; }`,
        otherFile
      ],
      [
        `export function Layout() { useSetAgentContext({}); return null; }`,
        'apps/web/src/app-layout.tsx'
      ]
    ] as const) {
      const result = lint(rule, source, file);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Only the page view registers');
    }
  });

  test('requires a context hook to register exactly once', () => {
    for (const source of [
      `export function useExampleAgentContext() { return 1; }`,
      `export function useExampleAgentContext() { useCurrentAgentContext(); }`
    ]) {
      const result = lint(rule, source, otherFile);
      expect(result.status).toBe(1);
      expect(result.output).toContain('must call useSetAgentContext');
    }
  });

  test('never counts useCurrentAgentContext', () => {
    const source = `export function Panel() { const current = useCurrentAgentContext(); return current; }`;
    expect(lint(rule, source, otherFile).status).toBe(0);
  });

  test('reports rendering a page View outside a page', () => {
    const result = lint(
      rule,
      `import { OtherView } from '@/features/other/other-view';
export function Panel() { return <OtherView />; }`,
      otherFile
    );
    expect(result.status).toBe(1);
    expect(result.output).toContain('page roots');
  });

  test('allows rendering a View from a non-view module', () => {
    const source = `import { MapView } from 'maplib';\nexport function Panel() { return <MapView />; }`;
    expect(lint(rule, source, otherFile).status).toBe(0);
  });

  test('ignores tests', () => {
    const source = `export function Panel() { useSetAgentContext({}); return null; }`;
    expect(lint(rule, source, 'apps/web/src/features/example/example-panel.test.tsx').status).toBe(
      0
    );
  });

  test('reports an aliased registration hook', () => {
    const source = `import { useSetAgentContext as useScreen } from '@groam/ai/ui/context/agent-context';
export function Panel() { useScreen({}); return null; }`;
    expect(lint(rule, source, otherFile).status).toBe(1);
  });

  test('reports a page that registers a context itself, but lets it render its View', () => {
    const page = 'apps/web/pages/(workspace)/example.tsx';
    const view = `import { ExampleView } from '@/features/example/example-view';\n`;
    expect(
      lint(rule, `${view}export default function Page() { return <ExampleView />; }`, page).status
    ).toBe(0);
    expect(
      lint(
        rule,
        `${view}import { useTripAgentContext } from '@/features/trips/hooks/use-trip-agent-context';
export default function Page() { useTripAgentContext(undefined, 'plan'); return <ExampleView />; }`,
        page
      ).status
    ).toBe(1);
  });
});
