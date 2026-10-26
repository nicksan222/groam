import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

type Route = {
  src?: string;
  dest?: string;
  handle?: string;
  status?: number;
  headers?: Record<string, string>;
};
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** Package both built frontends, never the checkout or its environment files. */
export function prepareVercel({
  landing,
  web,
  destination,
  projectId,
  orgId
}: {
  landing: string;
  web: string;
  destination: string;
  projectId: string;
  orgId: string;
}) {
  const output = join(destination, '.vercel/output');
  const staticOutput = join(output, 'static');
  mkdirSync(staticOutput, { recursive: true });
  cpSync(landing, staticOutput, { recursive: true });
  cpSync(web, join(staticOutput, 'app'), { recursive: true });
  const landingPages: Route[] = readdirSync(landing, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === 'index.html')
    .map((entry) => relative(landing, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .flatMap((page): Route[] => {
      const directory = page.slice(0, -'index.html'.length).replace(/\/$/u, '');
      if (!directory) return [{ src: '^/?$', dest: '/index.html' }];
      const pathname = `/${directory}`;
      return [
        { src: `^${escapePattern(pathname)}$`, status: 308, headers: { Location: `${pathname}/` } },
        { src: `^${escapePattern(pathname)}/$`, dest: `/${page}` }
      ];
    });
  const routes: Route[] = [
    { src: '^/app$', status: 308, headers: { Location: '/app/' } },
    ...landingPages,
    { handle: 'filesystem' },
    { src: '^/app/.*$', dest: '/app/index.html' },
    { src: '/.*', dest: '/404.html', status: 404 }
  ];
  writeFileSync(join(output, 'config.json'), JSON.stringify({ version: 3, routes }));
  mkdirSync(join(destination, '.vercel'), { recursive: true });
  writeFileSync(join(destination, '.vercel/project.json'), JSON.stringify({ projectId, orgId }));
}

if (import.meta.main) {
  const [landing, web, destination, projectId, orgId] = process.argv.slice(2);
  if (!landing || !web || !destination || !projectId || !orgId)
    throw new Error(
      'Usage: prepare-vercel.ts <landing-dist> <web-dist> <destination> <projectId> <orgId>'
    );
  prepareVercel({
    landing: resolve(landing),
    web: resolve(web),
    destination: resolve(destination),
    projectId,
    orgId
  });
}
