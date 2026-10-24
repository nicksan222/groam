import type { Plugin } from 'vite-plus';
import { generateComponentManifest, scanPages } from 'void/pages';

const moduleId = 'virtual:groam/void-pages';

/**
 * Exposes Void's own page manifest (components, layout chains, route patterns) to journeys, which
 * mount the real page tree in the browser test runner without a Worker.
 */
export function voidPagesManifest(root: string): Plugin {
  const pagesDir = `${root}/pages`;
  return {
    name: 'groam:void-pages-manifest',
    resolveId(id) {
      return id === moduleId ? `\0${moduleId}` : undefined;
    },
    async load(id) {
      if (id !== `\0${moduleId}`) return undefined;
      const scan = await scanPages(root, { pagesDir });
      const patterns = scan.pages.map(({ componentId, pattern }) => ({ id: componentId, pattern }));
      return [
        generateComponentManifest(scan, pagesDir),
        `export const pagePatterns = ${JSON.stringify(patterns)};`,
        'export { components, layoutTree };'
      ].join('\n');
    }
  };
}
