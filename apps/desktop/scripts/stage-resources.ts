import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const copyPaths = [
  { source: 'package.json' },
  { source: 'bun.lock' },
  { source: 'convex.json' },
  { destination: 'runtime', source: 'apps/desktop/runtime' },
  { source: 'tooling/devkit' },
  { source: 'packages' },
  { source: 'apps/web/dist' },
  { source: 'node_modules' }
];

const isNodeModulesSegment = (filePath: string) =>
  filePath.split(/[\\/]/u).includes('node_modules');

const isIncompatibleNodeModule = (filePath: string, target?: string) =>
  target?.endsWith('-linux-gnu') === true &&
  filePath.split(/[\\/]/u).some((segment) => segment.includes('musl'));

export const pruneDanglingSymlinks = (root: string) => {
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        if (!existsSync(fullPath)) {
          rmSync(fullPath, { force: true });
        }
        continue;
      }

      if (entry.isDirectory()) {
        pending.push(fullPath);
      }
    }
  }
};

export const stageRuntimeResources = (projectRoot: string, stageRoot: string, target?: string) => {
  rmSync(stageRoot, { force: true, recursive: true });
  mkdirSync(stageRoot, { recursive: true });

  for (const { destination, source } of copyPaths) {
    // fallow-ignore-next-line security-sink -- source is from the closed copyPaths list above
    const sourcePath = path.join(projectRoot, source);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing runtime resource: ${source}`);
    }

    // fallow-ignore-next-line security-sink -- destination is from the closed copyPaths list above
    cpSync(sourcePath, path.join(stageRoot, destination ?? source), {
      filter:
        source === 'packages'
          ? (entry) => !isNodeModulesSegment(entry)
          : source === 'node_modules'
            ? (entry) => !isIncompatibleNodeModule(entry, target)
            : undefined,
      recursive: true
    });
  }

  pruneDanglingSymlinks(stageRoot);
  writeFileSync(path.join(stageRoot, '.groam-runtime-build'), `${Date.now()}\n`);
  console.info(`Staged Groam runtime at ${stageRoot}`);
};

if (import.meta.main) {
  const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const stageRoot = path.join(projectRoot, 'apps/desktop/src-tauri/groam-runtime');
  const targetFlag = process.argv.indexOf('--target');
  const target = targetFlag === -1 ? undefined : process.argv[targetFlag + 1];
  if (targetFlag !== -1 && !target) {
    throw new Error('--target requires a Rust target triple');
  }
  stageRuntimeResources(projectRoot, stageRoot, target);
}
