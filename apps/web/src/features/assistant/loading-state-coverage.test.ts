import { describe, expect, test } from 'vitest';

const routeSources = import.meta.glob('../../routes/*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw'
}) as Record<string, string>;

const featureSources = import.meta.glob('../**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
}) as Record<string, string>;

const LOADING_STATE_PATTERN =
  /useReadyValue\s*\(|(?:^|[^\w])showLoading\b|(?:^|[^\w])pageLoading\b|(?:^|[^\w])proposalLoading\b|presentation\.kind\s*===\s*['"]loading['"]|(?:^|[^\w])isLoading(?:\s*[=?:{]|\s*\|\||\s*&&)|<[A-Z][\w]*Loading\b|function [A-Z][\w]*Loading\b|role=\{[^}]*['"]status['"]|role=["']status["']|aria-busy=\{?\s*true|aria-busy=["']true["']|LoadingPlaceholder|from ['"][^'"]*-loading(?:-shell)?['"]/u;

function routeNameFromPath(routePath: string): string {
  return routePath.split('/').at(-1) ?? routePath;
}

function importedFeatureNames(source: string): string[] {
  const names: string[] = [];
  for (const match of source.matchAll(
    /import\s+(?:type\s+)?(?:(\w+)|\{([^}]+)\})\s+from\s+['"]@\/features\/[^'"]+['"]/gu
  )) {
    if (match[1]) names.push(match[1]);
    for (const binding of (match[2] ?? '').split(',')) {
      const name = binding
        .trim()
        .replace(/^type\s+/u, '')
        .split(/\s+as\s+/u)
        .pop();
      if (name) names.push(name);
    }
  }
  return names;
}

function usesIdentifierAsView(source: string, name: string): boolean {
  const token = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return (
    new RegExp(`(?:^|[\\s,{])component:\\s*${token}\\b`, 'u').test(source) ||
    new RegExp(`<${token}\\b`, 'u').test(source)
  );
}

/** Product pages compose a feature view. Layouts, outlets, and redirects do not. */
function isProductPage(routeSource: string): boolean {
  if (/(?:^|[\s,{])component:\s*Outlet\b/u.test(routeSource)) return false;
  if (/(?:^|[\s,{])component:\s*\(\)\s*=>\s*null/u.test(routeSource)) return false;
  return importedFeatureNames(routeSource).some((name) => usesIdentifierAsView(routeSource, name));
}

function shouldSkipFeaturePath(path: string): boolean {
  return path.includes('/hooks/') || path.includes('.test.') || path.includes('/test-');
}

function resolveImportPath(specifier: string, importerPath?: string): string | null {
  if (specifier.startsWith('@/features/')) {
    return `../${specifier.slice('@/features/'.length)}`;
  }
  if (specifier.startsWith('./') && importerPath) {
    return `${importerPath.slice(0, importerPath.lastIndexOf('/') + 1)}${specifier.slice(2)}`;
  }
  return null;
}

function featureFilesForRoute(
  source: string,
  visited = new Set<string>(),
  importerPath?: string
): string[] {
  const files: string[] = [];
  const imports = [...source.matchAll(/from ['"](@\/features\/[^'"]+|\.\/[^'"]+)['"]/gu)];

  for (const match of imports) {
    const specifier = match[1];
    if (!specifier) continue;
    const basePath = resolveImportPath(specifier, importerPath);
    if (!basePath) continue;

    for (const extension of ['.tsx', '.ts']) {
      const path = `${basePath}${extension}`;
      const fileSource = featureSources[path];
      if (!(fileSource && !visited.has(path) && !shouldSkipFeaturePath(path))) continue;

      visited.add(path);
      files.push(path);
      files.push(...featureFilesForRoute(fileSource, visited, path));
    }
  }

  return files;
}

describe('page loading state coverage', () => {
  const productPages = Object.entries(routeSources).filter(([, source]) => isProductPage(source));
  const skipped = Object.keys(routeSources).filter(
    (path) => !isProductPage(routeSources[path] ?? '')
  );

  test('classifies every route file as a product page or as layout/redirect', () => {
    expect(Object.keys(routeSources).length).toBe(productPages.length + skipped.length);
    expect(productPages.length).toBeGreaterThan(0);
    expect(
      skipped.every((path) => !isProductPage(routeSources[path] ?? '')),
      `non-pages must not render a feature view: ${skipped.map(routeNameFromPath).join(', ')}`
    ).toBe(true);
  });

  for (const [routePath, routeSource] of productPages) {
    const routeName = routeNameFromPath(routePath);

    test(`${routeName} defines a loading state`, () => {
      const files = featureFilesForRoute(routeSource);
      const loadingFiles = files.filter((path) =>
        LOADING_STATE_PATTERN.test(featureSources[path] ?? '')
      );

      expect(files.length, `${routeName} must compose a feature page`).toBeGreaterThan(0);
      expect(
        loadingFiles.length,
        `${routeName} must define loading UI (isLoading, showLoading, useReadyValue, *Loading, role="status", etc.) in composed features; checked: ${files.join(', ') || '(none)'}`
      ).toBeGreaterThan(0);
    });
  }
});
