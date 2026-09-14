import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { brandAssetPaths } from '@groam/brand/assets';

const destination = fileURLToPath(new URL('../dist/groam-mark.svg', import.meta.url));

await copyFile(brandAssetPaths.mark, destination);
