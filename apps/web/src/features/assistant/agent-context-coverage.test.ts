import { describe, expect, test } from 'vite-plus/test';

const routeSources = import.meta.glob('../../../pages/**/*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw'
}) as Record<string, string>;
const featureSources = import.meta.glob('../**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
}) as Record<string, string>;

// Layouts, redirects, and the not-found page render no product page of their own.
const infrastructureRoutes = new Set([
  'layout.tsx',
  '[...path].tsx',
  '(workspace)/layout.tsx',
  '(workspace)/chat/layout.tsx',
  '(workspace)/chat/index.tsx',
  '(workspace)/group/[section].tsx',
  '(workspace)/group/index.tsx',
  '(workspace)/ideas/[proposalId].tsx',
  '(workspace)/settings/index.tsx',
  '(workspace)/trips/[tripId]/ideas/[proposalId]/index.tsx',
  '(workspace)/trips/[tripId]/index.tsx'
]);

function featurePageFor(
  routeSource: string,
  visited = new Set<string>(),
  importerPath?: string
): { path: string; source: string } | null {
  for (const path of importedFeaturePaths(routeSource, importerPath)) {
    const source = featureSources[path];
    if (!source || visited.has(path)) continue;
    visited.add(path);
    if (hasAgentContext(source)) return { path, source };
    const nested = featurePageFor(source, visited, path);
    if (nested) return nested;
  }
  return null;
}

function importedFeaturePaths(routeSource: string, importerPath?: string): string[] {
  return [...routeSource.matchAll(/from ['"](@\/features\/[^'"]+|\.\/[^'"]+)['"]/gu)].flatMap(
    ([, specifier]) => {
      if (!specifier) return [];
      const basePath = specifier.startsWith('@/features/')
        ? `../${specifier.slice('@/features/'.length)}`
        : `${importerPath?.slice(0, importerPath.lastIndexOf('/') + 1)}${specifier.slice(2)}`;
      return [`${basePath}.tsx`, `${basePath}.ts`];
    }
  );
}

function hasAgentContext(source: string): boolean {
  return /use(?:Set|[A-Z][A-Za-z0-9]*)AgentContext\s*\(/u.test(source);
}

describe('agent page context coverage', () => {
  for (const [routePath, routeSource] of Object.entries(routeSources)) {
    const routeName = routePath.slice(routePath.indexOf('/pages/') + '/pages/'.length);
    if (infrastructureRoutes.has(routeName)) continue;

    test(`${routeName} forwards page context to Groam AI`, () => {
      const page = featurePageFor(routeSource);
      expect(page, `${routeName} must compose a feature page`).not.toBeNull();
      expect(
        page?.source,
        `${page?.path ?? routeName} must call useSetAgentContext or a domain use*AgentContext hook`
      ).toMatch(/use(?:Set|[A-Z][A-Za-z0-9]*)AgentContext\s*\(/u);
    });
  }
});
