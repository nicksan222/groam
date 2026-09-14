import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root';

export const localPorts = {
  convexApi: 3210,
  convexSite: 3211,
  dashboard: 6790,
  web: 5173
} as const;

export const localOrigins = {
  convexApi: `http://127.0.0.1:${localPorts.convexApi}`,
  convexSite: `http://127.0.0.1:${localPorts.convexSite}`,
  dashboard: `http://127.0.0.1:${localPorts.dashboard}`,
  vite: `http://localhost:${localPorts.web}`,
  viteLoopback: `http://127.0.0.1:${localPorts.web}`
} as const;

type WorkspacePackageJson = {
  packageManager?: string;
};

type ConvexConfig = {
  node?: {
    nodeVersion?: string;
  };
};

const workspacePackage = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8')
) as WorkspacePackageJson;
const convexConfig = JSON.parse(
  readFileSync(join(repoRoot, 'convex.json'), 'utf8')
) as ConvexConfig;

const bunVersion = workspacePackage.packageManager?.replace(/^bun@/u, '') ?? '';
const nodeMajor = Number(convexConfig.node?.nodeVersion ?? '');

if (!bunVersion || !Number.isInteger(nodeMajor)) {
  throw new Error('Unable to resolve toolchain pins from package.json / convex.json');
}

export const toolchain = { bunVersion, nodeMajor } as const;

export const constantValues = {
  bunVersion: toolchain.bunVersion,
  convexApiOrigin: localOrigins.convexApi,
  convexApiPort: String(localPorts.convexApi),
  convexSiteOrigin: localOrigins.convexSite,
  convexSitePort: String(localPorts.convexSite),
  dashboardOrigin: localOrigins.dashboard,
  dashboardPort: String(localPorts.dashboard),
  nodeMajor: String(toolchain.nodeMajor),
  viteLoopbackOrigin: localOrigins.viteLoopback,
  viteOrigin: localOrigins.vite,
  webPort: String(localPorts.web)
} as const;

export type ConstantName = keyof typeof constantValues;
