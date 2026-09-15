import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brandAssetPaths } from '@groam/brand/assets';

const destination = resolve(import.meta.dirname, '../dist/groam-mark.svg');

await copyFile(brandAssetPaths.mark, destination);
