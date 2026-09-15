import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env as desktopToolingEnv } from '@groam/env/desktop-tooling';
import { extractZip } from './extract-zip';

export const PINNED_CONVEX_BACKEND_VERSION = 'precompiled-2026-08-25-7cce8fb';

const PINNED_CONVEX_BACKEND_SHA256 = {
  'convex-local-backend-aarch64-apple-darwin.zip':
    '98831b0f511f6eed70b0b4dfca62015df57877e08017d2b2979b39d62ae7317b',
  'convex-local-backend-aarch64-unknown-linux-gnu.zip':
    'a0601ec584fe9f514c473af6d57a4c209e4d2d775e4ac1b5d1b90bafd85b7e2f',
  'convex-local-backend-x86_64-apple-darwin.zip':
    'd142472d996f08907cd9fdf61cc154c36edee3039342f45fdd925cefedabea29',
  'convex-local-backend-x86_64-pc-windows-msvc.zip':
    'e20e0bb2db04487706014f3270750db213a8ea0f3e5432e6294f0f8be08a9356',
  'convex-local-backend-x86_64-unknown-linux-gnu.zip':
    '470250263fcf6c71b931219550c3705d9ab03d79c3b1e1e8364465c2b44eff9f'
} as const;

export function hostTargetTriple(platform = process.platform, arch = process.arch): string {
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  }
  if (platform === 'win32') {
    return 'x86_64-pc-windows-msvc';
  }
  return arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu';
}

export function parseSidecarTarget(args: string[], fallbackTarget: string = process.arch): string {
  const targetIndex = args.indexOf('--target');
  const target = targetIndex === -1 ? fallbackTarget : args[targetIndex + 1];

  if (!target) {
    throw new Error('Missing --target argument for prepare-sidecar');
  }

  return target;
}

export function isRequiredSidecarPrep(args: string[], isCI = desktopToolingEnv.isCI): boolean {
  return args.includes('--required') || isCI;
}

export function latestPrecompiledDir(entries: readonly string[]): string | undefined {
  return entries
    .filter((entry) => entry.startsWith('precompiled-'))
    .sort()
    .at(-1);
}

function isWindowsSidecarTarget(target: string): boolean {
  return target.includes('windows') || target.includes('pc-windows');
}

export function sidecarBinaryName(target: string): string {
  return `convex-local-backend-${target}${isWindowsSidecarTarget(target) ? '.exe' : ''}`;
}

function convexBackendFileName(target: string): string {
  return isWindowsSidecarTarget(target) ? 'convex-local-backend.exe' : 'convex-local-backend';
}

export function convexBackendAsset(target: string): string {
  if (isWindowsSidecarTarget(target)) return 'convex-local-backend-x86_64-pc-windows-msvc.zip';
  if (target.includes('apple-darwin')) {
    return target.includes('aarch64')
      ? 'convex-local-backend-aarch64-apple-darwin.zip'
      : 'convex-local-backend-x86_64-apple-darwin.zip';
  }
  if (target.includes('aarch64')) return 'convex-local-backend-aarch64-unknown-linux-gnu.zip';
  return 'convex-local-backend-x86_64-unknown-linux-gnu.zip';
}

export function convexBackendDownloadUrl(version: string, target: string): string {
  return `https://github.com/get-convex/convex-backend/releases/download/${version}/${convexBackendAsset(target)}`;
}

export function convexCacheRoot(home = homedir()): string {
  return path.join(home, '.cache/convex/binaries');
}

export type PrepareSidecarIo = {
  copyFile: (source: string, destination: string) => void;
  download: (url: string, destination: string) => number;
  exists: (path: string) => boolean;
  extract: (archive: string, destination: string) => number;
  fetchVersion: () => string | null;
  mkdir: (path: string, options?: { recursive?: boolean }) => void;
  readCache: (cacheRoot: string) => string[];
  sha256: (path: string) => string;
  tempDir: () => string;
  write: (message: string, stream?: 'out' | 'err') => void;
};

export type PrepareSidecarOptions = {
  binariesDir: string;
  cacheRoot: string;
  io?: Partial<PrepareSidecarIo>;
  required: boolean;
  target: string;
};

const missingVersionMessage =
  'Could not resolve the Convex local backend version; runtime will download on first launch.';
const missingBinaryMessage =
  'Convex local backend sidecar was not downloaded; runtime will download on first launch.';

export function prepareSidecar({
  binariesDir,
  cacheRoot,
  io = {},
  required,
  target
}: PrepareSidecarOptions): number {
  const copyFile = io.copyFile ?? copyFileSync;
  const download = io.download ?? downloadFile;
  const exists = io.exists ?? existsSync;
  const extract = io.extract ?? extractZip;
  const fetchVersion = io.fetchVersion ?? pinnedBackendVersion;
  const mkdir = io.mkdir ?? mkdirSync;
  const readCache = io.readCache ?? ((dir) => readdirSync(dir));
  const sha256 = io.sha256 ?? sha256File;
  const tempDir =
    io.tempDir ?? (() => mkdtempSync(path.join(tmpdir(), 'groam-convex-'), { encoding: 'utf8' }));
  const write = io.write ?? defaultWrite;

  mkdir(binariesDir, { recursive: true });
  const sidecarPath = path.join(binariesDir, sidecarBinaryName(target));
  if (exists(sidecarPath) && !required) {
    write(`Using existing Convex sidecar at ${sidecarPath}`);
    return 0;
  }

  if (!required) {
    const cached = cachedBackendPath(cacheRoot, target, exists, readCache);
    if (cached) {
      copyFile(cached, sidecarPath);
      write(`Prepared sidecar binary at ${sidecarPath}`);
      return 0;
    }
  }

  const version = fetchVersion();
  if (!version) {
    return missingOptionalCache(required, missingVersionMessage, write);
  }

  const workDir = tempDir();
  const archive = path.join(workDir, convexBackendAsset(target));
  const extractDir = path.join(workDir, 'extract');
  mkdir(extractDir, { recursive: true });

  const downloadStatus = download(convexBackendDownloadUrl(version, target), archive);
  if (downloadStatus !== 0) {
    return missingOptionalCache(required, missingBinaryMessage, write);
  }

  const expectedHash = pinnedBackendSha256(target);
  if (!expectedHash || sha256(archive) !== expectedHash) {
    return missingOptionalCache(
      required,
      'Convex local backend archive hash did not match the pinned digest.',
      write
    );
  }

  const extractStatus = extract(archive, extractDir);
  if (extractStatus !== 0) {
    return missingOptionalCache(required, missingBinaryMessage, write);
  }

  const extracted = backendBinaryInExtract(extractDir, target, exists);
  if (!extracted) {
    return missingOptionalCache(required, missingBinaryMessage, write);
  }

  copyFile(extracted, sidecarPath);
  write(`Prepared sidecar binary at ${sidecarPath}`);
  rmSync(workDir, { force: true, recursive: true });
  return 0;
}

function cachedBackendPath(
  cacheRoot: string,
  target: string,
  exists: PrepareSidecarIo['exists'],
  readCache: PrepareSidecarIo['readCache']
): string | null {
  if (!exists(cacheRoot)) return null;
  const latestDir = latestPrecompiledDir(readCache(cacheRoot));
  if (!latestDir) return null;
  const sourceBinary = path.join(cacheRoot, latestDir, convexBackendFileName(target));
  return exists(sourceBinary) ? sourceBinary : null;
}

function backendBinaryInExtract(
  extractRoot: string,
  target: string,
  exists: PrepareSidecarIo['exists']
): string | null {
  const name = convexBackendFileName(target);
  const candidates = [path.join(extractRoot, name), path.join(extractRoot, 'convex-local-backend')];
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

function missingOptionalCache(
  required: boolean,
  message: string,
  write: PrepareSidecarIo['write']
): number {
  if (required) {
    write(message, 'err');
    return 1;
  }

  write(message);
  return 0;
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function pinnedBackendVersion(): string {
  return PINNED_CONVEX_BACKEND_VERSION;
}

export function pinnedBackendSha256(target: string): string | undefined {
  return PINNED_CONVEX_BACKEND_SHA256[
    convexBackendAsset(target) as keyof typeof PINNED_CONVEX_BACKEND_SHA256
  ];
}

function defaultWrite(message: string, stream: 'out' | 'err' = 'out') {
  const output = stream === 'err' ? console.error : console.info;
  output(message);
}

function downloadFile(url: string, destination: string): number {
  const result = spawnSync('curl', ['-fsSL', url, '-o', destination], { stdio: 'inherit' });
  return result.status ?? 1;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  process.exit(
    prepareSidecar({
      binariesDir: fileURLToPath(new URL('../src-tauri/binaries/', import.meta.url)),
      cacheRoot: convexCacheRoot(),
      required: isRequiredSidecarPrep(args),
      target: parseSidecarTarget(args, hostTargetTriple())
    })
  );
}
