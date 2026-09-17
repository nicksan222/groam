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

const infrastructureRoutes = new Set([
  '__root.tsx',
  '_workspace.tsx',
  '_workspace.agents.$agentId.tsx',
  '_workspace.chat.index.tsx',
  '_workspace.group.$section.tsx',
  '_workspace.group.index.tsx',
  '_workspace.group.tsx',
  '_workspace.ideas.$proposalId.tsx',
  '_workspace.settings.index.tsx',
  '_workspace.settings.tsx',
  '_workspace.trips.$tripId.ideas.$proposalId.index.tsx',
  '_workspace.trips.$tripId.ideas.$proposalId.tsx',
  '_workspace.trips.$tripId.index.tsx',
  '_workspace.trips.$tripId.tsx'
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
    const segments = routePath.split('/');
    const routeName = segments[segments.length - 1] ?? routePath;
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
