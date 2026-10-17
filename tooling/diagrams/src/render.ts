import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Route } from 'playwright';

// Every `<name>.excalidraw` under docs/ renders to `<name>.svg` beside it.
const docsRoot = fileURLToPath(new URL('../../../docs', import.meta.url));
const utilsRoot = dirname(fileURLToPath(import.meta.resolve('@excalidraw/utils')));
const origin = 'http://diagrams.local';
const exportPadding = 24;

const page = `<!doctype html><meta charset="utf-8"><script type="module">
  const { exportToSvg } = await import('${origin}/utils.js');
  window.renderScene = async (scene) =>
    (await exportToSvg({ data: scene, config: { padding: ${exportPadding} } })).outerHTML;
</script>`;

async function findScenes(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true });
  return entries
    .filter((entry) => entry.endsWith('.excalidraw'))
    .map((entry) => join(directory, entry))
    .sort();
}

async function serve(route: Route) {
  const { pathname } = new URL(route.request().url());
  if (pathname === '/') {
    return route.fulfill({ body: page, contentType: 'text/html' });
  }
  if (pathname === '/utils.js') {
    return route.fulfill({ path: join(utilsRoot, 'index.js'), contentType: 'text/javascript' });
  }
  return route.abort();
}

const scenes = await findScenes(docsRoot);
const browser = await chromium.launch();
try {
  const tab = await browser.newPage();
  tab.on('pageerror', (error) => console.error(error));
  await tab.route(`${origin}/**`, serve);
  await tab.goto(`${origin}/`);
  await tab.waitForFunction(() => 'renderScene' in globalThis);
  for (const scenePath of scenes) {
    const scene = JSON.parse(await readFile(scenePath, 'utf8'));
    const svg = await tab.evaluate(
      (input) =>
        (globalThis as unknown as { renderScene: (scene: unknown) => Promise<string> }).renderScene(
          input
        ),
      { elements: scene.elements, appState: scene.appState, files: scene.files ?? {} }
    );
    const svgPath = scenePath.replace(/\.excalidraw$/, '.svg');
    await writeFile(svgPath, `${svg}\n`);
    console.log(`rendered ${relative(docsRoot, svgPath)}`);
  }
} finally {
  await browser.close();
}
