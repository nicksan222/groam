import type { Stats } from 'node:fs';
import { lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { resolveDataConvexPath, runtimeEnv } from './env';

export type LinkDataDirectoryOptions = {
  dataDirIsSet?: boolean;
  replaceExistingDirectory?: boolean;
};

function lstatIfPresent(targetPath: string): Stats | undefined {
  try {
    return lstatSync(targetPath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function resolvedLinkTarget(linkPath: string): string {
  return path.resolve(path.dirname(linkPath), readlinkSync(linkPath));
}

/** Point the Convex project state at a persistent data directory. */
export const linkDataDirectory = (
  dataDir = runtimeEnv.dataDir,
  options: LinkDataDirectoryOptions = {}
) => {
  const convexLinkPath = path.join(process.cwd(), '.convex');
  const dataConvexPath = resolveDataConvexPath(dataDir);
  const dataDirIsSet = options.dataDirIsSet ?? runtimeEnv.dataDirIsExplicit;
  const replaceExistingDirectory = options.replaceExistingDirectory ?? runtimeEnv.replaceConvexDir;

  mkdirSync(dataConvexPath, { recursive: true });

  const stats = lstatIfPresent(convexLinkPath);
  if (stats?.isSymbolicLink()) {
    if (resolvedLinkTarget(convexLinkPath) === path.resolve(dataConvexPath)) {
      return;
    }
    unlinkSync(convexLinkPath);
  } else if (stats) {
    if (!(dataDirIsSet && replaceExistingDirectory)) {
      throw new Error(
        `Refusing to replace existing .convex path at ${convexLinkPath}. ` +
          'Set GROAM_DATA_DIR and GROAM_REPLACE_CONVEX_DIR=1 to replace it with a data-dir symlink.'
      );
    }
    rmSync(convexLinkPath, { recursive: true, force: true });
  }

  symlinkSync(dataConvexPath, convexLinkPath);
};
