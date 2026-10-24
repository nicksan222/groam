import { fileURLToPath } from 'node:url';

export const brandAssetPaths = {
  mark: fileURLToPath(new URL('../assets/mark.svg', import.meta.url))
} as const;
