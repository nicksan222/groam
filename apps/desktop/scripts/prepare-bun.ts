import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractZip } from './extract-zip';
import { hostTargetTriple, isRequiredSidecarPrep, parseSidecarTarget } from './prepare-sidecar';

const BUN_VERSION = '1.3.11';

/** Pinned SHA-256 of bun-v1.3.11 zip assets from oven-sh/bun SHASUMS256.txt. */
export const BUN_ASSET_SHA256 = {
  'bun-darwin-aarch64.zip': '6f5a3467ed9caec4795bf78cd476507d9f870c7d57b86c945fcb338126772ffc',
  'bun-darwin-x64.zip': 'c4fe2b9247218b0295f24e895aaec8fee62e74452679a9026b67eacbd611a286',
  'bun-linux-aarch64.zip': 'd13944da12a53ecc74bf6a720bd1d04c4555c038dfe422365356a7be47691fdf',
  'bun-linux-x64.zip': '8611ba935af886f05a6f38740a15160326c15e5d5d07adef966130b4493607ed',
  'bun-windows-x64.zip': '066f8694f8b7d8df592452746d18f01710d4053e93030922dbc6e8c34a8c4b9f'
} as const;

export function bunAssetSha256(asset: string): string {
  const hash = BUN_ASSET_SHA256[asset as keyof typeof BUN_ASSET_SHA256];
  if (!hash) {
    throw new Error(`No pinned SHA-256 for Bun asset ${asset}`);
  }
  return hash;
}

export function bunReleaseAsset(target: string): string {
  if (target.includes('windows') || target.includes('pc-windows')) return 'bun-windows-x64.zip';
  if (target.includes('apple-darwin')) {
    return target.includes('aarch64') ? 'bun-darwin-aarch64.zip' : 'bun-darwin-x64.zip';
  }
  if (target.includes('aarch64')) return 'bun-linux-aarch64.zip';
  return 'bun-linux-x64.zip';
}

export function bunSidecarFileName(target: string): string {
  const windows = target.includes('windows') || target.includes('pc-windows');
  return windows ? `bun-${target}.exe` : `bun-${target}`;
}

export function bunDownloadUrl(target: string, version = BUN_VERSION): string {
  return `https://github.com/oven-sh/bun/releases/download/bun-v${version}/${bunReleaseAsset(target)}`;
}

export type PrepareBunIo = {
  copyFile: (source: string, destination: string) => void;
  download: (url: string, destination: string) => number;
  exists: (path: string) => boolean;
  extract: (archive: string, destination: string) => number;
  hashFile: (path: string) => string;
  mkdir: (path: string, options?: { recursive?: boolean }) => void;
  tempDir: () => string;
  write: (message: string, stream?: 'out' | 'err') => void;
};

export type PrepareBunOptions = {
  binariesDir: string;
  io?: Partial<PrepareBunIo>;
  required: boolean;
  target: string;
};

function defaultWrite(message: string, stream: 'out' | 'err' = 'out') {
  const output = stream === 'err' ? console.error : console.info;
  output(message);
}

function downloadFile(url: string, destination: string): number {
  const result = spawnSync('curl', ['-fsSL', url, '-o', destination], { stdio: 'inherit' });
  return result.status ?? 1;
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function bunBinaryInExtract(
  extractRoot: string,
  windows: boolean,
  exists: (path: string) => boolean
): string | null {
  const names = windows ? ['bun.exe'] : ['bun'];
  const candidates = names.flatMap((name) => [
    path.join(extractRoot, name),
    path.join(extractRoot, 'bun-windows-x64', name),
    path.join(extractRoot, 'bun-darwin-aarch64', name),
    path.join(extractRoot, 'bun-darwin-x64', name),
    path.join(extractRoot, 'bun-linux-x64', name),
    path.join(extractRoot, 'bun-linux-aarch64', name)
  ]);
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

export function prepareBun({ binariesDir, io = {}, required, target }: PrepareBunOptions): number {
  const runtime = resolvePrepareBunIo(io);
  runtime.mkdir(binariesDir, { recursive: true });
  const sidecarPath = path.join(binariesDir, bunSidecarFileName(target));
  if (runtime.exists(sidecarPath) && !required) {
    runtime.write(`Using existing Bun sidecar at ${sidecarPath}`);
    return 0;
  }
  return downloadBunSidecar({ required, runtime, sidecarPath, target });
}

type BunRuntime = Required<PrepareBunIo>;

function resolvePrepareBunIo(io: Partial<PrepareBunIo>): BunRuntime {
  const copyFile = io.copyFile ?? copyFileSync;
  const download = io.download ?? downloadFile;
  const exists = io.exists ?? existsSync;
  const extract = io.extract ?? extractZip;
  const hashFile = io.hashFile ?? sha256File;
  const mkdir = io.mkdir ?? mkdirSync;
  const write = io.write ?? defaultWrite;
  const tempDir =
    io.tempDir ?? (() => mkdtempSync(path.join(tmpdir(), 'groam-bun-'), { encoding: 'utf8' }));

  return { copyFile, download, exists, extract, hashFile, mkdir, tempDir, write };
}

function downloadBunSidecar({
  required,
  runtime,
  sidecarPath,
  target
}: {
  required: boolean;
  runtime: BunRuntime;
  sidecarPath: string;
  target: string;
}): number {
  const { copyFile, download, exists, extract, hashFile, mkdir, tempDir, write } = runtime;
  const workDir = tempDir();
  const archive = path.join(workDir, bunReleaseAsset(target));
  const extractDir = path.join(workDir, 'extract');
  mkdir(extractDir, { recursive: true });

  const downloadStatus = download(bunDownloadUrl(target), archive);
  if (downloadStatus !== 0) {
    if (required) {
      write('Failed to download the Bun sidecar.', 'err');
      return downloadStatus;
    }
    write('Bun sidecar download skipped; packaged app will look for bun on PATH.');
    return 0;
  }

  const expectedHash = bunAssetSha256(bunReleaseAsset(target));
  const actualHash = hashFile(archive);
  if (actualHash !== expectedHash) {
    if (required) {
      write(
        `Bun sidecar checksum mismatch for ${bunReleaseAsset(target)} (expected ${expectedHash}, got ${actualHash}).`,
        'err'
      );
      return 1;
    }
    write('Bun sidecar checksum mismatch; packaged app will look for bun on PATH.');
    return 0;
  }

  const extractStatus = extract(archive, extractDir);
  if (extractStatus !== 0) {
    if (required) {
      write('Failed to extract the Bun sidecar.', 'err');
      return extractStatus;
    }
    write('Bun sidecar extract skipped; packaged app will look for bun on PATH.');
    return 0;
  }

  const windows = target.includes('windows') || target.includes('pc-windows');
  const extracted = bunBinaryInExtract(extractDir, windows, exists);
  if (!extracted) {
    if (required) {
      write('Extracted Bun archive did not contain a bun binary.', 'err');
      return 1;
    }
    write('Bun binary missing from archive; packaged app will look for bun on PATH.');
    return 0;
  }

  copyFile(extracted, sidecarPath);
  write(`Prepared Bun sidecar at ${sidecarPath}`);
  rmSync(workDir, { force: true, recursive: true });
  return 0;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  process.exit(
    prepareBun({
      binariesDir: fileURLToPath(new URL('../src-tauri/binaries/', import.meta.url)),
      required: isRequiredSidecarPrep(args),
      target: parseSidecarTarget(args, hostTargetTriple())
    })
  );
}
