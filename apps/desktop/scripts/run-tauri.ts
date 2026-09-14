import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tauriCspOverlay } from './csp';

const desktopRoot = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const overlay = tauriCspOverlay({ skipBeforeBuild: args.includes('--ci') });
const result = spawnSync('bunx', ['tauri', ...args, '--config', JSON.stringify(overlay)], {
  cwd: desktopRoot,
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
