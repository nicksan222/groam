import { describe, expect, test } from 'bun:test';
import {
  convexBackendAsset,
  convexBackendDownloadUrl,
  hostTargetTriple,
  isRequiredSidecarPrep,
  latestPrecompiledDir,
  PINNED_CONVEX_BACKEND_VERSION,
  parseSidecarTarget,
  pinnedBackendSha256,
  prepareSidecar,
  sidecarBinaryName
} from './prepare-sidecar';

describe('parseSidecarTarget', () => {
  test('uses --target when present', () => {
    expect(parseSidecarTarget(['--target', 'x86_64-unknown-linux-gnu'], 'arm64')).toBe(
      'x86_64-unknown-linux-gnu'
    );
  });

  test('falls back to the host arch', () => {
    expect(parseSidecarTarget([], 'arm64')).toBe('arm64');
  });
});

describe('isRequiredSidecarPrep', () => {
  test('is optional for local runs', () => {
    expect(isRequiredSidecarPrep([], false)).toBe(false);
  });

  test('is required in CI or with --required', () => {
    expect(isRequiredSidecarPrep([], true)).toBe(true);
    expect(isRequiredSidecarPrep(['--required'], false)).toBe(true);
  });
});

describe('latestPrecompiledDir', () => {
  test('returns the last precompiled cache directory', () => {
    expect(latestPrecompiledDir(['notes.txt', 'precompiled-1.2.0', 'precompiled-1.3.0'])).toBe(
      'precompiled-1.3.0'
    );
  });
});

describe('hostTargetTriple', () => {
  test('maps Node platform and arch onto Tauri triples', () => {
    expect(hostTargetTriple('linux', 'x64')).toBe('x86_64-unknown-linux-gnu');
    expect(hostTargetTriple('darwin', 'arm64')).toBe('aarch64-apple-darwin');
    expect(hostTargetTriple('win32', 'x64')).toBe('x86_64-pc-windows-msvc');
  });
});

describe('sidecarBinaryName', () => {
  test('uses Tauri externalBin naming', () => {
    expect(sidecarBinaryName('x86_64-unknown-linux-gnu')).toBe(
      'convex-local-backend-x86_64-unknown-linux-gnu'
    );
    expect(sidecarBinaryName('x86_64-pc-windows-msvc')).toBe(
      'convex-local-backend-x86_64-pc-windows-msvc.exe'
    );
  });
});

describe('convexBackendAsset', () => {
  test('maps Tauri triples onto Convex GitHub assets', () => {
    expect(convexBackendAsset('x86_64-unknown-linux-gnu')).toBe(
      'convex-local-backend-x86_64-unknown-linux-gnu.zip'
    );
    expect(convexBackendAsset('aarch64-apple-darwin')).toBe(
      'convex-local-backend-aarch64-apple-darwin.zip'
    );
    expect(convexBackendAsset('x86_64-pc-windows-msvc')).toBe(
      'convex-local-backend-x86_64-pc-windows-msvc.zip'
    );
  });
});

describe('convexBackendDownloadUrl', () => {
  test('points at the convex-backend release for the resolved version', () => {
    expect(
      convexBackendDownloadUrl(PINNED_CONVEX_BACKEND_VERSION, 'x86_64-unknown-linux-gnu')
    ).toBe(
      `https://github.com/get-convex/convex-backend/releases/download/${PINNED_CONVEX_BACKEND_VERSION}/convex-local-backend-x86_64-unknown-linux-gnu.zip`
    );
  });
});

describe('prepareSidecar', () => {
  const binariesDir = '/repo/apps/desktop/src-tauri/binaries';
  const cacheRoot = '/home/user/.cache/convex/binaries';
  const linuxTarget = 'x86_64-unknown-linux-gnu';

  test('warns and exits 0 when the backend cannot be resolved locally', () => {
    const writes: string[] = [];
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: false,
      target: linuxTarget,
      io: {
        exists: () => false,
        fetchVersion: () => null,
        mkdir: () => undefined,
        write: (message) => writes.push(message)
      }
    });

    expect(status).toBe(0);
    expect(writes[0]).toMatch(/version/u);
  });

  test('exits non-zero when the backend cannot be resolved in release CI', () => {
    const writes: Array<{ message: string; stream?: string }> = [];
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: true,
      target: linuxTarget,
      io: {
        exists: () => false,
        fetchVersion: () => null,
        mkdir: () => undefined,
        write: (message, stream) => writes.push({ message, stream })
      }
    });

    expect(status).toBe(1);
    expect(writes[0]?.stream).toBe('err');
  });

  test('copies a cached backend only for optional local prep', () => {
    const copied: Array<[string, string]> = [];
    const cachedBinary = `${cacheRoot}/precompiled-1.1.0/convex-local-backend`;
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: false,
      target: linuxTarget,
      io: {
        copyFile: (source, destination) => {
          copied.push([String(source), String(destination)]);
        },
        exists: (filePath) => filePath === cacheRoot || filePath === cachedBinary,
        fetchVersion: () => {
          throw new Error('should use the local cache');
        },
        mkdir: () => undefined,
        readCache: () => ['precompiled-1.0.0', 'precompiled-1.1.0'],
        write: () => undefined
      }
    });

    expect(status).toBe(0);
    expect(copied).toEqual([[cachedBinary, `${binariesDir}/convex-local-backend-${linuxTarget}`]]);
  });

  test('ignores an unverified cache when packaging is required', () => {
    const downloaded: string[] = [];
    const cachedBinary = `${cacheRoot}/precompiled-1.1.0/convex-local-backend`;
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: true,
      target: linuxTarget,
      io: {
        copyFile: () => undefined,
        download: (url) => {
          downloaded.push(url);
          return 0;
        },
        exists: (filePath) =>
          filePath === cacheRoot ||
          filePath === cachedBinary ||
          filePath.endsWith('/extract/convex-local-backend'),
        extract: () => 0,
        fetchVersion: () => PINNED_CONVEX_BACKEND_VERSION,
        mkdir: () => undefined,
        readCache: () => ['precompiled-1.1.0'],
        sha256: () => pinnedBackendSha256(linuxTarget) ?? '',
        tempDir: () => '/tmp/groam-convex',
        write: () => undefined
      }
    });

    expect(status).toBe(0);
    expect(downloaded).toEqual([
      convexBackendDownloadUrl(PINNED_CONVEX_BACKEND_VERSION, linuxTarget)
    ]);
  });

  test('downloads the GitHub release when the local cache is empty', () => {
    const copied: Array<[string, string]> = [];
    const downloaded: string[] = [];
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: true,
      target: linuxTarget,
      io: {
        copyFile: (source, destination) => {
          copied.push([source, destination]);
        },
        download: (url) => {
          downloaded.push(url);
          return 0;
        },
        exists: (filePath) => filePath.endsWith('/extract/convex-local-backend'),
        extract: () => 0,
        fetchVersion: () => PINNED_CONVEX_BACKEND_VERSION,
        mkdir: () => undefined,
        sha256: () => pinnedBackendSha256(linuxTarget) ?? '',
        tempDir: () => '/tmp/groam-convex',
        write: () => undefined
      }
    });

    expect(status).toBe(0);
    expect(downloaded).toEqual([
      convexBackendDownloadUrl(PINNED_CONVEX_BACKEND_VERSION, linuxTarget)
    ]);
    expect(copied).toEqual([
      [
        '/tmp/groam-convex/extract/convex-local-backend',
        `${binariesDir}/convex-local-backend-${linuxTarget}`
      ]
    ]);
  });

  test('skips download when an optional sidecar already exists', () => {
    let fetched = false;
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: false,
      target: linuxTarget,
      io: {
        exists: () => true,
        fetchVersion: () => {
          fetched = true;
          return PINNED_CONVEX_BACKEND_VERSION;
        },
        mkdir: () => undefined,
        write: () => undefined
      }
    });
    expect(status).toBe(0);
    expect(fetched).toBe(false);
  });

  test('rejects a downloaded archive whose hash does not match the pin', () => {
    const writes: Array<{ message: string; stream?: string }> = [];
    const status = prepareSidecar({
      binariesDir,
      cacheRoot,
      required: true,
      target: linuxTarget,
      io: {
        download: () => 0,
        exists: () => false,
        extract: () => 0,
        fetchVersion: () => PINNED_CONVEX_BACKEND_VERSION,
        mkdir: () => undefined,
        sha256: () => '0'.repeat(64),
        tempDir: () => '/tmp/groam-convex',
        write: (message, stream) => writes.push({ message, stream })
      }
    });

    expect(status).toBe(1);
    expect(writes[0]?.stream).toBe('err');
    expect(writes[0]?.message).toMatch(/pinned digest/u);
  });
});
