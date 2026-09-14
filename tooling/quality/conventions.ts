/**
 * Size ownership: this checker owns feature-TSX *file* length
 * (`MAX_COMPONENT_FILE_LINES` = 300). Biome owns *function* length
 * (`noExcessiveLinesPerFunction` maxLines 250 in `tooling/biome-config`).
 * Do not add a third size limit.
 */
const sourceExtension = /\.(?:[cm]?[jt]sx?|astro)$/u;
const styleSourceExtension = /\.(?:css|[cm]?[jt]sx?|astro)$/u;
const kebabName = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/u;
const kebabDirectory = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const parentImport = /(?:from\s+|import\(\s*)['"]\.\.\//u;
const generatedPath = /(?:^|\/)(?:_generated|\.astro)(?:\/|$)/u;
const generatedFile = /(?:^|\/)routeTree\.gen\.ts$/u;
const tanstackRoute = /^apps\/web\/src\/routes\//u;
const hardcodedColor = /#[\da-f]{3,8}\b|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/giu;
const gradient = /(?:linear|radial|conic)-gradient\s*\(|\bbg-(?:gradient|linear|radial|conic)-/giu;
const rawConvexAccess = /\b(?:ctx|this\.ctx)\s*\.\s*db\b/gu;
const convexDbRoot = /^packages\/backend\/convex\/(?:modules|routes)\//u;
const convexNodeRuntime = /(?:^|\n)\s*['"]use node['"]/u;
const convexMigration = /^packages\/backend\/convex\/migrations\.ts$/u;
const backendTestSupport = /^packages\/backend\/(?:convex\/.*\.test\.ts|testing\/)/u;
const envPackage = /^packages\/env\//u;
const importMetaEnv = /\bimport\.meta\.env\b/u;
const importSpecifier = /(?:from\s+|import\(\s*)['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gmu;
const designTokenFiles = new Set([
  'packages/ui/src/styles/globals.css',
  'packages/ui/src/styles/tokens.css'
]);

const groamUiPrefix = '@groam/ui/';
const groamAiPrefix = '@groam/ai-contracts/';
const uiInternalSrcPrefix = '#src/';
const allowedUiSubpaths = ['ai/', 'components/', 'hooks/', 'lib/', 'styles'] as const;
const routePathAliases = ['@/features/', '@/lib/'] as const;
const routeUiComposers = ['@groam/ui/ai'] as const;
const allowedRouteSpecifiers = [
  '@tanstack/react-router',
  '@groam/ai-contracts',
  '@groam/auth',
  '@groam/backend',
  '@groam/env',
  ...routePathAliases,
  ...routeUiComposers
] as const;

/** Feature UI in the web app and AI package: one exported component per file. */
const componentFileScope = /^(?:apps\/web|packages\/ui\/src\/ai)\//u;
const testOrSpecFile = /\.(?:test|spec)\./u;
const componentName = '([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)';
const exportedComponent = new RegExp(
  `^export (?:default )?(?:async )?function ${componentName}\\b` +
    `|^export const ${componentName} = ` +
    `|^export (?:default )?class ${componentName}\\b`,
  'gmu'
);
// Unnamed defaults (`export default memo(Foo)`, `export default function ()`)
// are not counted: HOCs and wrappers are too noisy to treat as components.
const MAX_COMPONENT_FILE_LINES = 300;

export type ConventionCategory =
  | 'ai-imports'
  | 'component-files'
  | 'directories'
  | 'export-targets'
  | 'gradients'
  | 'halo-imports'
  | 'hardcoded-colors'
  | 'import-meta-env'
  | 'legacy-modules'
  | 'names'
  | 'parent-imports'
  | 'raw-convex-access'
  | 'route-imports'
  | 'ui-imports'
  | 'ui-internal-imports';

export type ConventionFinding = {
  category: ConventionCategory;
  location: string;
};

export type SourceFile = {
  path: string;
  source: string;
};

export type InspectOptions = {
  aiExportPatterns?: readonly RegExp[];
  allowedRouteSpecifiers?: readonly string[];
  uiExportSubpaths?: ReadonlySet<string>;
  uiSrcImportTargetsTsx?: (subpath: string) => boolean;
};

export function uiExportSubpathsFromMap(exportsMap: Record<string, unknown>): Set<string> {
  return new Set(
    Object.keys(exportsMap)
      .filter((key) => key !== '.' && key !== './index')
      .map((key) => key.replace(/^\.\//u, ''))
  );
}

export function packageExportPatternsFromMap(exportsMap: Record<string, unknown>): RegExp[] {
  return Object.keys(exportsMap)
    .filter((key) => key !== '.' && key !== './index')
    .map((key) => {
      const pattern = key.replace(/^\.\//u, '').replace(/\./gu, '\\.').replace(/\*/gu, '[^/]+');
      return new RegExp(`^${pattern}$`, 'u');
    });
}

/** `@groam/*` (except UI) and the router from the web app, plus local route aliases. */
export function routePackageAllowlistFromWebDependencies(
  dependencies: Record<string, string>
): string[] {
  const fromPackage = Object.keys(dependencies).filter(
    (name) =>
      name === '@tanstack/react-router' || (name.startsWith('@groam/') && name !== '@groam/ui')
  );
  return [...fromPackage, ...routePathAliases, ...routeUiComposers];
}

export function matchesPackageExport(subpath: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(subpath));
}

function isGeneratedPath(filePath: string): boolean {
  return generatedPath.test(filePath) || generatedFile.test(filePath);
}

export function invalidDirectoryNames(filePath: string): string[] {
  const invalid: string[] = [];
  let prefix = '';
  for (const directory of filePath.split('/').slice(0, -1)) {
    prefix = prefix === '' ? directory : `${prefix}/${directory}`;
    if (
      directory.length > 0 &&
      !directory.startsWith('.') &&
      directory !== '_generated' &&
      prefix !== '.github/ISSUE_TEMPLATE' &&
      !kebabDirectory.test(directory)
    ) {
      invalid.push(prefix);
    }
  }
  return invalid;
}

export function inspectFile(
  filePath: string,
  source: string,
  options?: InspectOptions
): ConventionFinding[] {
  if (isGeneratedPath(filePath)) return [];

  const findings: ConventionFinding[] = [];

  if (filePath.endsWith('.mjs')) {
    findings.push({ category: 'legacy-modules', location: filePath });
  }

  if (styleSourceExtension.test(filePath)) {
    findings.push(...inspectStyle(filePath, source));
  }

  if (!sourceExtension.test(filePath)) return findings;

  findings.push(...inspectComponentFile(filePath, source));

  if (!tanstackRoute.test(filePath)) {
    const baseName = filePath.slice(filePath.lastIndexOf('/') + 1).replace(sourceExtension, '');
    if (!kebabName.test(baseName)) {
      findings.push({ category: 'names', location: filePath });
    }
  }

  if (parentImport.test(source)) {
    findings.push({ category: 'parent-imports', location: filePath });
  }

  if (
    filePath.startsWith('packages/backend/convex/') &&
    !convexDbRoot.test(filePath) &&
    !convexMigration.test(filePath) &&
    !backendTestSupport.test(filePath)
  ) {
    for (const match of source.matchAll(rawConvexAccess)) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push({ category: 'raw-convex-access', location: `${filePath}:${line}` });
    }
  }

  if (convexDbRoot.test(filePath) && convexNodeRuntime.test(source)) {
    for (const match of source.matchAll(rawConvexAccess)) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push({ category: 'raw-convex-access', location: `${filePath}:${line}` });
    }
  }

  if (!envPackage.test(filePath) && importMetaEnv.test(source)) {
    const line = source.slice(0, source.search(importMetaEnv)).split('\n').length;
    findings.push({ category: 'import-meta-env', location: `${filePath}:${line}` });
  }

  findings.push(...inspectImportSpecifiers(filePath, source, options));
  return findings;
}

export function inspectFiles(
  files: readonly SourceFile[],
  options?: InspectOptions
): ConventionFinding[] {
  const directoryNames = new Set<string>();
  const findings: ConventionFinding[] = [];

  for (const file of files) {
    for (const directory of invalidDirectoryNames(file.path)) {
      directoryNames.add(directory);
    }
    findings.push(...inspectFile(file.path, file.source, options));
  }

  return [
    ...[...directoryNames]
      .sort()
      .map((directory) => ({ category: 'directories' as const, location: directory })),
    ...findings
  ];
}

function inspectStyle(filePath: string, source: string): ConventionFinding[] {
  const findings: ConventionFinding[] = [];
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\n]/gu, ' '))
    .replace(
      /(^|[^:])\/\/.*$/gmu,
      (lineComment, prefix: string) =>
        `${prefix}${lineComment.slice(prefix.length).replace(/[^\n]/gu, ' ')}`
    );

  const isDesignTokenFile = designTokenFiles.has(filePath);

  for (const [index, line] of withoutComments.split('\n').entries()) {
    hardcodedColor.lastIndex = 0;
    // Raw colors + gradients belong only in design-token CSS (tokens/globals).
    if (!isDesignTokenFile && hardcodedColor.test(line)) {
      findings.push({ category: 'hardcoded-colors', location: `${filePath}:${index + 1}` });
    }
    gradient.lastIndex = 0;
    if (!isDesignTokenFile && gradient.test(line)) {
      findings.push({ category: 'gradients', location: `${filePath}:${index + 1}` });
    }
  }

  return findings;
}

function inspectImportSpecifiers(
  filePath: string,
  source: string,
  options?: InspectOptions
): ConventionFinding[] {
  const findings: ConventionFinding[] = [];
  importSpecifier.lastIndex = 0;

  for (const match of source.matchAll(importSpecifier)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;
    const line = source.slice(0, match.index).split('\n').length;
    const location = `${filePath}:${line}`;

    if (specifier === '@halo' || specifier.startsWith('@halo/')) {
      findings.push({ category: 'halo-imports', location });
    }

    if (specifier === '@groam/ui' || specifier.startsWith(groamUiPrefix)) {
      const subpath = specifier.slice(groamUiPrefix.length);
      const allowed = allowedUiSubpaths.some(
        (prefix) => subpath === prefix.replace(/\/$/u, '') || subpath.startsWith(prefix)
      );
      if (!allowed) {
        findings.push({ category: 'ui-imports', location });
      } else if (options?.uiExportSubpaths && !options.uiExportSubpaths.has(subpath)) {
        findings.push({ category: 'ui-imports', location });
      }
    }

    if (specifier.startsWith(groamAiPrefix) && options?.aiExportPatterns) {
      const subpath = specifier.slice(groamAiPrefix.length);
      if (!matchesPackageExport(subpath, options.aiExportPatterns)) {
        findings.push({ category: 'ai-imports', location });
      }
    }

    if (
      filePath.startsWith('packages/ui/') &&
      specifier.startsWith(uiInternalSrcPrefix) &&
      options?.uiSrcImportTargetsTsx?.(specifier.slice(uiInternalSrcPrefix.length))
    ) {
      findings.push({ category: 'ui-internal-imports', location });
    }

    if (tanstackRoute.test(filePath) && !isAllowedRouteSpecifier(specifier, options)) {
      findings.push({ category: 'route-imports', location });
    }
  }

  return findings;
}

function inspectComponentFile(filePath: string, source: string): ConventionFinding[] {
  if (
    !filePath.endsWith('.tsx') ||
    !componentFileScope.test(filePath) ||
    testOrSpecFile.test(filePath)
  ) {
    return [];
  }

  const findings: ConventionFinding[] = [];
  const lines = source.split('\n').length;
  if (lines > MAX_COMPONENT_FILE_LINES) {
    findings.push({
      category: 'component-files',
      location: `${filePath} (${lines} lines, max ${MAX_COMPONENT_FILE_LINES})`
    });
  }

  exportedComponent.lastIndex = 0;
  const exported = [...source.matchAll(exportedComponent)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? ''
  );
  if (exported.length > 1) {
    findings.push({
      category: 'component-files',
      location: `${filePath} exports ${exported.join(', ')}`
    });
  }

  return findings;
}

function isAllowedRouteSpecifier(specifier: string, options?: InspectOptions): boolean {
  const allowed = options?.allowedRouteSpecifiers ?? allowedRouteSpecifiers;
  return allowed.some((entry) =>
    entry.endsWith('/')
      ? specifier.startsWith(entry)
      : specifier === entry || specifier.startsWith(`${entry}/`)
  );
}
