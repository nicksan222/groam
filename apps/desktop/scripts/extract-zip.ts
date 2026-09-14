import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

export function windowsTarPath(systemRoot = 'C:\\Windows'): string {
  return `${systemRoot}\\System32\\tar.exe`;
}

export function extractZipArgs(
  platform: NodeJS.Platform,
  archive: string,
  destination: string,
  systemRoot = 'C:\\Windows'
): [string, string[]] {
  if (platform === 'win32') {
    // Git Bash GNU tar cannot extract zip and treats `C:` as a remote host.
    // Windows ships libarchive tar.exe, which handles both.
    return [windowsTarPath(systemRoot), ['-xf', archive, '-C', destination]];
  }
  return ['unzip', ['-o', archive, '-d', destination]];
}

export function extractZip(
  archive: string,
  destination: string,
  platform: NodeJS.Platform = process.platform
): number {
  mkdirSync(destination, { recursive: true });
  const [command, args] = extractZipArgs(platform, archive, destination);
  return spawnSync(command, args, { stdio: 'inherit' }).status ?? 1;
}
