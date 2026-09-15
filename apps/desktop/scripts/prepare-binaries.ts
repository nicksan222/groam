import { fileURLToPath } from 'node:url';
import { prepareBun } from './prepare-bun';
import {
  convexCacheRoot,
  hostTargetTriple,
  isRequiredSidecarPrep,
  parseSidecarTarget,
  prepareSidecar
} from './prepare-sidecar';

if (import.meta.main) {
  const args = process.argv.slice(2);
  const target = parseSidecarTarget(args, hostTargetTriple());
  const required = isRequiredSidecarPrep(args);
  const binariesDir = fileURLToPath(new URL('../src-tauri/binaries/', import.meta.url));

  const bunStatus = prepareBun({ binariesDir, required, target });
  if (bunStatus !== 0) process.exit(bunStatus);

  process.exit(
    prepareSidecar({
      binariesDir,
      cacheRoot: convexCacheRoot(),
      required,
      target
    })
  );
}
