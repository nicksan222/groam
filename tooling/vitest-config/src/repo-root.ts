import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function declaresWorkspaces(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const workspaces = Reflect.get(value, 'workspaces');
  if (Array.isArray(workspaces)) return true;

  return (
    typeof workspaces === 'object' &&
    workspaces !== null &&
    Array.isArray(Reflect.get(workspaces, 'packages'))
  );
}

export function resolveRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const manifestPath = path.join(current, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (declaresWorkspaces(manifest)) {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to find the workspace root from ${startDir}`);
    }
    current = parent;
  }
}
