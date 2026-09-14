import { fileURLToPath } from 'node:url';

export const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
export const artifactsDir = fileURLToPath(new URL('../artifacts/', import.meta.url));
export const entryPoint = fileURLToPath(new URL('./video/index.tsx', import.meta.url));
