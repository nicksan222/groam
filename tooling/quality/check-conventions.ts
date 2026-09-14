import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ConventionFinding,
  inspectFile,
  invalidDirectoryNames,
  packageExportPatternsFromMap,
  routePackageAllowlistFromWebDependencies,
  uiExportSubpathsFromMap
} from './conventions';
import { invalidPackageDependencies, type PackageManifest } from './package-boundaries';

type ExportTarget = string | Record<string, string>;

type PackageJson = {
  dependencies?: Record<string, string>;
  exports?: Record<string, ExportTarget>;
};

const packageManifestPaths = [
  'packages/ai-contracts/package.json',
  'packages/auth/package.json',
  'packages/backend/package.json',
  'packages/env/package.json',
  'packages/ui/package.json'
] as const;

function readPackageExports(path: string): PackageJson {
  return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
}

function resolvedExportFile(target: ExportTarget): string | null {
  if (typeof target === 'string') return target;
  return target.import ?? target.browser ?? target.default ?? target.types ?? null;
}

function findMissingExportTargets(
  exportsMap: Record<string, ExportTarget>,
  packageDir: string
): string[] {
  const missing: string[] = [];
  for (const [key, target] of Object.entries(exportsMap)) {
    const file = resolvedExportFile(target);
    if (key === '.' || key === './index' || !file || file.includes('*')) continue;
    const resolved = join(packageDir, file.replace(/^\.\//u, ''));
    if (!existsSync(resolved)) {
      missing.push(`${key} -> ${file}`);
    }
  }
  return missing;
}

const uiPackage = readPackageExports('packages/ui/package.json');
const aiPackage = readPackageExports('packages/ai-contracts/package.json');
const webPackage = readPackageExports('apps/web/package.json');
const uiExportSubpaths = uiExportSubpathsFromMap(uiPackage.exports ?? {});
const aiExportPatterns = packageExportPatternsFromMap(aiPackage.exports ?? {});
const allowedRouteSpecifiers = routePackageAllowlistFromWebDependencies(
  webPackage.dependencies ?? {}
);

const inspectOptions = {
  aiExportPatterns,
  allowedRouteSpecifiers,
  uiExportSubpaths,
  uiSrcImportTargetsTsx: (subpath: string) => {
    const tsPath = join('packages/ui/src', `${subpath}.ts`);
    const tsxPath = join('packages/ui/src', `${subpath}.tsx`);
    return existsSync(tsxPath) && !existsSync(tsPath);
  }
};

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8'
})
  .trim()
  .split('\n')
  .filter((file) => file && !file.includes('/vendor/'));

const misplacedBrowserSpecs = files.filter(
  (file) => /\.spec\.[cm]?[jt]sx?$/u.test(file) && !file.startsWith('apps/web/e2e/')
);
if (misplacedBrowserSpecs.length > 0) {
  console.error(
    `Browser journey specs belong to apps/web/e2e:\n${misplacedBrowserSpecs
      .map((file) => `  - ${file}`)
      .join('\n')}`
  );
  process.exit(1);
}

const actionNames = readdirSync('tooling/app-actions/src/actions')
  .filter((file) => file.endsWith('.ts'))
  .map((file) => file.slice(0, -3));
const incompleteActions = actionNames.filter(
  (name) =>
    !existsSync(`tooling/app-actions/src/backend/${name}.ts`) ||
    !existsSync(`tooling/app-actions/src/playwright/actions/${name}.ts`)
);
if (incompleteActions.length > 0) {
  console.error(
    `Every app action needs backend and Playwright implementations:\n${incompleteActions
      .map((name) => `  - ${name}`)
      .join('\n')}`
  );
  process.exit(1);
}

const actionRegistries = [
  'tooling/app-actions/src/app-actions.ts',
  'tooling/app-actions/src/backend/backend-app-actions.ts',
  'tooling/app-actions/src/playwright/playwright-app-actions.ts'
] as const;
const missingActionRegistrations = actionNames.flatMap((name) => {
  const capability = name.replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase());
  return actionRegistries
    .filter((file) => !readFileSync(file, 'utf8').includes(capability))
    .map((file) => `${name} -> ${file}`);
});
if (missingActionRegistrations.length > 0) {
  console.error(
    `Every app action must be attached to both adapters:\n${missingActionRegistrations
      .map((registration) => `  - ${registration}`)
      .join('\n')}`
  );
  process.exit(1);
}

const ambiguousActionImports = files.filter((file) => {
  if (!/\.[cm]?[jt]sx?$/u.test(file) || !existsSync(file)) return false;
  const source = readFileSync(file, 'utf8');
  return /(?:from\s+|import\(\s*)['"]@groam\/app-actions(?:['"]|\/(?!backend(?:['"]|\/)|ids['"]|playwright(?:['"]|\/)))/u.test(
    source
  );
});
if (ambiguousActionImports.length > 0) {
  console.error(
    `Import app actions through @groam/app-actions/backend, @groam/app-actions/ids, or @groam/app-actions/playwright:\n${ambiguousActionImports
      .map((file) => `  - ${file}`)
      .join('\n')}`
  );
  process.exit(1);
}

const productInteractionFiles = files.filter(
  (file) => file.startsWith('apps/web/e2e/') || file === 'tooling/showcase/video.ts'
);
const directProductInteraction =
  /\.(?:check|click|dblclick|dragTo|fill|goto|hover|press|reload|selectOption|setInputFiles|uncheck)\s*\(/gu;
const manualProductInteractions = productInteractionFiles.flatMap((file) => {
  if (!existsSync(file)) return [];
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(directProductInteraction)].map((match) => {
    const line = source.slice(0, match.index).split('\n').length;
    return `${file}:${line}`;
  });
});
if (manualProductInteractions.length > 0) {
  console.error(
    `Compose product interactions through @groam/app-actions/playwright:\n${manualProductInteractions
      .map((file) => `  - ${file}`)
      .join('\n')}`
  );
  process.exit(1);
}

const directoryNames = new Set<string>();
const findings: ConventionFinding[] = [];

const packageBoundaryFindings = packageManifestPaths.flatMap((path) =>
  invalidPackageDependencies(JSON.parse(readFileSync(path, 'utf8')) as PackageManifest)
);
if (packageBoundaryFindings.length > 0) {
  console.error(
    `Package dependencies must follow packages/README.md:\n${packageBoundaryFindings
      .map((finding) => `  - ${finding}`)
      .join('\n')}`
  );
  process.exit(1);
}

for (const missing of findMissingExportTargets(uiPackage.exports ?? {}, 'packages/ui')) {
  findings.push({ category: 'export-targets', location: `packages/ui/package.json ${missing}` });
}
for (const missing of findMissingExportTargets(aiPackage.exports ?? {}, 'packages/ai-contracts')) {
  findings.push({
    category: 'export-targets',
    location: `packages/ai-contracts/package.json ${missing}`
  });
}

for (const file of files) {
  for (const directory of invalidDirectoryNames(file)) {
    directoryNames.add(directory);
  }
  if (!existsSync(file)) continue;
  findings.push(...inspectFile(file, readFileSync(file, 'utf8'), inspectOptions));
}

const byCategory = new Map<ConventionFinding['category'], string[]>();
for (const directory of [...directoryNames].sort()) {
  const locations = byCategory.get('directories') ?? [];
  locations.push(directory);
  byCategory.set('directories', locations);
}
for (const finding of findings) {
  const locations = byCategory.get(finding.category) ?? [];
  locations.push(finding.location);
  byCategory.set(finding.category, locations);
}

const messages: Record<ConventionFinding['category'], string> = {
  'ai-imports': 'Import AI contracts through an exported @groam/ai-contracts/* entrypoint',
  'component-files':
    'Feature TSX files must export at most one component and stay under 300 lines — split extra components into their own kebab-case files',
  directories: 'Folder names must use kebab-case',
  'export-targets': 'Package exports must point at files that exist on disk',
  gradients: 'Use flat semantic colors instead of gradients',
  'halo-imports': 'Use @groam/* package names instead of leftover Halo package aliases',
  'hardcoded-colors': 'Use semantic color tokens instead of hardcoded colors',
  'import-meta-env':
    'Read environment variables from @groam/env/* instead of unvalidated Vite env access',
  'legacy-modules': 'Use TypeScript instead of .mjs for repository-owned modules',
  names: 'Source filenames must use kebab-case',
  'parent-imports': 'Parent-directory imports must use package aliases',
  'raw-convex-access': 'Raw Convex database access must stay inside modules and routes',
  'route-imports':
    'Web route files must only compose feature views and may import from @/features, @/lib, @tanstack/react-router, or @groam packages',
  'ui-imports':
    'Import UI through an exported @groam/ui/components/*, @groam/ui/hooks/*, @groam/ui/lib/*, or @groam/ui/styles entrypoint',
  'ui-internal-imports':
    'Import TSX modules inside packages/ui with #tsx/* instead of #src/* (package imports map #src/* to .ts only)'
};

if (byCategory.size === 0) {
  console.log(
    'Folder names, source filenames, imports, environment access, UI entrypoints, route composition, flat color usage, and Convex database access follow repository conventions.'
  );
  process.exit(0);
}

for (const [category, locations] of byCategory) {
  console.error(
    `${messages[category]}:\n${locations.map((location) => `  - ${location}`).join('\n')}`
  );
}

process.exit(1);
