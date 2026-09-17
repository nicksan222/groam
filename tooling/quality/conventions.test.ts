import { describe, expect, test } from 'bun:test';
import {
  inspectFile,
  inspectFiles,
  invalidDirectoryNames,
  matchesPackageExport,
  missingFeatureHookTests,
  packageExportPatternsFromMap,
  routePackageAllowlistFromWebDependencies,
  uiExportSubpathsFromMap
} from './conventions';

const parentModule = `from '${'..'}/trip-sections'`;
const hexWhite = `#${'fff'}`;
const hexBackground = `#${'0b0b0c'}`;
const gradientClass = `bg-${'gradient-to-r'}`;
const gradientImage = `linear-${'gradient'}(90deg, transparent, currentColor)`;
const viteEnv = ['import', 'meta', 'env'].join('.');
const groamUiRoot = ['@groam', 'ui'].join('/');
const groamUiButton = ['@groam', 'ui', 'components', 'button'].join('/');
const groamUiUtils = ['@groam', 'ui', 'lib', 'utils'].join('/');
const groamUiSource = ['@groam', 'ui', 'src', 'components', 'button'].join('/');
const haloButton = ['@halo', 'ui', 'components', 'button'].join('/');
const groamEnv = ['@groam', 'env', 'web-client'].join('/');
const groamAiRegistry = ['@groam', 'ai-contracts', 'agents', 'registry'].join('/');
const groamAiMissing = ['@groam', 'ai-contracts', 'tools', 'missing-tool'].join('/');

describe('invalidDirectoryNames', () => {
  test('accepts kebab-case folders and ignores generated or hidden segments', () => {
    expect(invalidDirectoryNames('apps/web/src/features/trips/hooks/use-trips.ts')).toEqual([]);
    expect(invalidDirectoryNames('packages/backend/convex/_generated/api.d.ts')).toEqual([]);
    expect(invalidDirectoryNames('.github/workflows/ci.yml')).toEqual([]);
    expect(invalidDirectoryNames('.github/ISSUE_TEMPLATE/bug.yml')).toEqual([]);
  });

  test('rejects PascalCase or snake_case folders', () => {
    expect(invalidDirectoryNames('apps/Web/src/app.tsx')).toEqual(['apps/Web']);
    expect(invalidDirectoryNames('packages/ui_kit/src/button.tsx')).toEqual(['packages/ui_kit']);
  });
});

describe('inspectFile', () => {
  test('skips generated contracts', () => {
    expect(
      inspectFile('apps/web/src/routeTree.gen.ts', `import '${'..'}/features/trips/TripView'`)
    ).toEqual([]);
    expect(
      inspectFile('packages/backend/convex/_generated/server.js', 'export const env = process.env;')
    ).toEqual([]);
  });

  test('requires kebab-case source filenames except TanStack routes', () => {
    expect(inspectFile('apps/web/src/features/trips/TripView.tsx', 'export {}')).toEqual([
      { category: 'names', location: 'apps/web/src/features/trips/TripView.tsx' }
    ]);
    expect(inspectFile('apps/web/src/routes/_workspace.trips.index.tsx', 'export {}')).toEqual([]);
  });

  test('keeps feature TSX files to one exported component', () => {
    expect(
      inspectFile(
        'apps/web/src/features/trips/trip-list.tsx',
        'export function TripList() { return null; }\n'
      )
    ).toEqual([]);
    expect(
      inspectFile(
        'apps/web/src/features/trips/trip-list.tsx',
        'export function TripList() { return null; }\nexport function TripRow() { return null; }\n'
      )
    ).toEqual([
      {
        category: 'component-files',
        location: 'apps/web/src/features/trips/trip-list.tsx exports TripList, TripRow'
      }
    ]);
    expect(
      inspectFile(
        'packages/ui/src/components/card.tsx',
        'export function Card() { return null; }\nexport function CardHeader() { return null; }\n'
      )
    ).toEqual([]);
    expect(
      inspectFile(
        'apps/web/src/features/trips/trip-card.tsx',
        'export default function TripCard() { return null; }\nexport class TripBadge { render() { return null; } }\n'
      )
    ).toEqual([
      {
        category: 'component-files',
        location: 'apps/web/src/features/trips/trip-card.tsx exports TripCard, TripBadge'
      }
    ]);
  });

  test('rejects parent-directory imports', () => {
    expect(
      inspectFile('apps/web/src/features/trips/hooks/use-trips.ts', `import { x } ${parentModule};`)
    ).toEqual([
      {
        category: 'parent-imports',
        location: 'apps/web/src/features/trips/hooks/use-trips.ts'
      }
    ]);
  });

  test('rejects hardcoded colors and gradients outside design tokens', () => {
    expect(inspectFile('apps/web/src/app.tsx', `const color = "${hexWhite}";`)).toEqual([
      { category: 'hardcoded-colors', location: 'apps/web/src/app.tsx:1' }
    ]);
    expect(inspectFile('apps/web/src/app.tsx', `className="${gradientClass}"`)).toEqual([
      { category: 'gradients', location: 'apps/web/src/app.tsx:1' }
    ]);
    expect(
      inspectFile('packages/ui/src/styles/tokens.css', `  --background: ${hexBackground};`)
    ).toEqual([]);
    expect(
      inspectFile('packages/ui/src/styles/globals.css', `  background-image: ${gradientImage};`)
    ).toEqual([]);
    expect(
      inspectFile('packages/ui/src/styles/utilities.css', `  color: ${hexBackground};`)
    ).toEqual([
      { category: 'hardcoded-colors', location: 'packages/ui/src/styles/utilities.css:1' }
    ]);
    expect(inspectFile('apps/web/src/app.tsx', `// const color = "${hexWhite}";`)).toEqual([]);
    expect(inspectFile('apps/web/src/app.tsx', `const ok = true; // fallback ${hexWhite}`)).toEqual(
      []
    );
  });

  test('keeps raw Convex database access inside modules and routes', () => {
    expect(
      inspectFile(
        'packages/backend/convex/http.ts',
        'export const run = { handler: async (ctx) => ctx.db.get("trips", id) };'
      )
    ).toEqual([
      {
        category: 'raw-convex-access',
        location: 'packages/backend/convex/http.ts:1'
      }
    ]);
    expect(
      inspectFile(
        'packages/backend/convex/routes/trips/create.ts',
        'export const run = { handler: async (ctx) => ctx.db.get("trips", id) };'
      )
    ).toEqual([]);
    expect(
      inspectFile(
        'packages/backend/convex/modules/travel/trips/ctx.ts',
        'export async function load(ctx) { return ctx.db.get("trips", id); }'
      )
    ).toEqual([]);
    expect(
      inspectFile(
        'packages/backend/convex/modules/travel/versions/git.ts',
        '\'use node\';\nexport async function load(ctx) { return ctx.db.get("trips", id); }'
      )
    ).toEqual([
      {
        category: 'raw-convex-access',
        location: 'packages/backend/convex/modules/travel/versions/git.ts:2'
      }
    ]);
  });

  test('rejects unvalidated Vite env access outside packages/env', () => {
    expect(inspectFile('apps/web/src/main.tsx', `const url = ${viteEnv}.VITE_CONVEX_URL;`)).toEqual(
      [{ category: 'import-meta-env', location: 'apps/web/src/main.tsx:1' }]
    );
    expect(
      inspectFile('packages/env/src/apps/web-client.ts', `const mode = ${viteEnv}.MODE;`)
    ).toEqual([]);
  });

  test('requires public @groam/ui entrypoints', () => {
    expect(
      inspectFile('apps/web/src/app.tsx', `import { Button } from '${groamUiButton}';`)
    ).toEqual([]);
    expect(inspectFile('apps/web/src/app.tsx', `import { cn } from '${groamUiUtils}';`)).toEqual(
      []
    );
    expect(inspectFile('apps/web/src/app.tsx', `import ui from '${groamUiRoot}';`)).toEqual([
      { category: 'ui-imports', location: 'apps/web/src/app.tsx:1' }
    ]);
    expect(
      inspectFile('apps/web/src/app.tsx', `import { Button } from '${groamUiSource}';`)
    ).toEqual([{ category: 'ui-imports', location: 'apps/web/src/app.tsx:1' }]);
  });

  test('rejects @groam/ui subpaths that are not package exports', () => {
    const groamUiInternal = ['@groam', 'ui', 'components', 'nav-user-sections'].join('/');
    const uiExportSubpaths = new Set(['components/button', 'lib/utils']);
    expect(
      inspectFile('apps/web/src/app.tsx', `import { Button } from '${groamUiButton}';`, {
        uiExportSubpaths
      })
    ).toEqual([]);
    expect(
      inspectFile('apps/web/src/app.tsx', `import { ThemeSection } from '${groamUiInternal}';`, {
        uiExportSubpaths
      })
    ).toEqual([{ category: 'ui-imports', location: 'apps/web/src/app.tsx:1' }]);
  });

  test('keeps web routes composing feature views', () => {
    expect(
      inspectFile(
        'apps/web/src/routes/_workspace.index.tsx',
        "import { createFileRoute } from '@tanstack/react-router';\nimport { DashboardView } from '@/features/dashboard/dashboard-view';"
      )
    ).toEqual([]);
    expect(
      inspectFile(
        'apps/web/src/routes/_workspace.index.tsx',
        `import { Button } from '${groamUiButton}';`
      )
    ).toEqual([
      { category: 'route-imports', location: 'apps/web/src/routes/_workspace.index.tsx:1' }
    ]);
    expect(
      inspectFile('apps/web/src/routes/_workspace.index.tsx', `import { env } from '${groamEnv}';`)
    ).toEqual([]);
  });

  test('rejects leftover Halo package names', () => {
    expect(inspectFile('apps/web/src/app.tsx', `import { Button } from '${haloButton}';`)).toEqual([
      { category: 'halo-imports', location: 'apps/web/src/app.tsx:1' }
    ]);
  });

  test('rejects repository-owned .mjs modules', () => {
    expect(inspectFile('tooling/quality/check.mjs', 'export {}')).toEqual([
      { category: 'legacy-modules', location: 'tooling/quality/check.mjs' }
    ]);
  });

  test('requires @groam/ai-contracts imports to match package exports', () => {
    const aiExportPatterns = packageExportPatternsFromMap({
      './agents/registry': './src/agents/registry/index.ts',
      './ui/context/*': './src/ui/context/*.tsx'
    });
    expect(
      inspectFile('apps/web/src/app.tsx', `import { x } from '${groamAiRegistry}';`, {
        aiExportPatterns
      })
    ).toEqual([]);
    expect(
      inspectFile('apps/web/src/app.tsx', `import { x } from '${groamAiMissing}';`, {
        aiExportPatterns
      })
    ).toEqual([{ category: 'ai-imports', location: 'apps/web/src/app.tsx:1' }]);
  });

  test('rejects #src imports that resolve only to TSX inside packages/ui', () => {
    expect(
      inspectFile(
        'packages/ui/src/components/example.tsx',
        "import { Button } from '#src/components/button';",
        {
          uiSrcImportTargetsTsx: (subpath) => subpath === 'components/button'
        }
      )
    ).toEqual([
      {
        category: 'ui-internal-imports',
        location: 'packages/ui/src/components/example.tsx:1'
      }
    ]);
    expect(
      inspectFile(
        'packages/ui/src/components/example.tsx',
        "import { cn } from '#src/lib/utils';",
        {
          uiSrcImportTargetsTsx: () => false
        }
      )
    ).toEqual([]);
  });
});

describe('missingFeatureHookTests', () => {
  test('requires new feature hooks to have a co-located test', () => {
    expect(
      missingFeatureHookTests(['apps/web/src/features/trips/hooks/use-new-capability.ts'])
    ).toEqual([
      {
        category: 'hook-tests',
        location: 'apps/web/src/features/trips/hooks/use-new-capability.ts'
      }
    ]);

    expect(
      missingFeatureHookTests([
        'apps/web/src/features/trips/hooks/use-new-capability.ts',
        'apps/web/src/features/trips/hooks/use-new-capability.test.tsx'
      ])
    ).toEqual([]);
  });

  test('does not let distant tests satisfy the co-location rule', () => {
    expect(
      missingFeatureHookTests([
        'apps/web/src/features/trips/hooks/use-new-capability.ts',
        'apps/web/src/features/trips/use-new-capability.test.ts'
      ]).length
    ).toBe(1);
  });
});

describe('inspectFiles', () => {
  test('aggregates directory findings across a file set', () => {
    const findings = inspectFiles([
      { path: 'apps/Web/src/app.tsx', source: 'export {}' },
      { path: 'packages/ui_kit/src/button.tsx', source: 'export {}' }
    ]);
    expect(findings.filter((finding) => finding.category === 'directories')).toEqual([
      { category: 'directories', location: 'apps/Web' },
      { category: 'directories', location: 'packages/ui_kit' }
    ]);
  });
});

describe('uiExportSubpathsFromMap', () => {
  test('strips the leading ./ and ignores a root barrel', () => {
    expect(
      uiExportSubpathsFromMap({
        '.': './src/index.ts',
        './components/button': './src/components/button.tsx',
        './styles': './src/styles/globals.css'
      })
    ).toEqual(new Set(['components/button', 'styles']));
  });
});

describe('packageExportPatternsFromMap', () => {
  test('turns wildcard exports into subpath patterns', () => {
    const patterns = packageExportPatternsFromMap({
      './registry': './src/registry.ts',
      './components/*': './src/components/*.tsx',
      './foo.bar': './src/foo.bar.ts'
    });
    expect(matchesPackageExport('registry', patterns)).toBe(true);
    expect(matchesPackageExport('components/assistant-chat-message', patterns)).toBe(true);
    expect(matchesPackageExport('components/hooks/use-assistant', patterns)).toBe(false);
    expect(matchesPackageExport('foo.bar', patterns)).toBe(true);
    expect(matchesPackageExport('fooXbar', patterns)).toBe(false);
  });
});

describe('routePackageAllowlistFromWebDependencies', () => {
  test('keeps groam packages except UI, plus the router and local aliases', () => {
    expect(
      routePackageAllowlistFromWebDependencies({
        '@groam/ai-contracts': 'workspace:*',
        '@groam/auth': 'workspace:*',
        '@groam/ui': 'workspace:*',
        '@tanstack/react-router': '^1.0.0',
        react: '^19.0.0'
      })
    ).toEqual([
      '@groam/ai-contracts',
      '@groam/auth',
      '@tanstack/react-router',
      '@/features/',
      '@/lib/',
      '@groam/ui/ai'
    ]);
  });
});
