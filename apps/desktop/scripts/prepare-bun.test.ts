import { describe, expect, test } from 'bun:test';
import {
  BUN_ASSET_SHA256,
  bunAssetSha256,
  bunDownloadUrl,
  bunReleaseAsset,
  bunSidecarFileName,
  prepareBun
} from './prepare-bun';

describe('bunReleaseAsset', () => {
  test('maps Tauri triples onto Bun GitHub assets', () => {
    expect(bunReleaseAsset('x86_64-unknown-linux-gnu')).toBe('bun-linux-x64.zip');
    expect(bunReleaseAsset('aarch64-unknown-linux-gnu')).toBe('bun-linux-aarch64.zip');
    expect(bunReleaseAsset('aarch64-apple-darwin')).toBe('bun-darwin-aarch64.zip');
    expect(bunReleaseAsset('x86_64-apple-darwin')).toBe('bun-darwin-x64.zip');
    expect(bunReleaseAsset('x86_64-pc-windows-msvc')).toBe('bun-windows-x64.zip');
  });
});

describe('bunSidecarFileName', () => {
  test('uses Tauri externalBin naming', () => {
    expect(bunSidecarFileName('x86_64-unknown-linux-gnu')).toBe('bun-x86_64-unknown-linux-gnu');
    expect(bunSidecarFileName('x86_64-pc-windows-msvc')).toBe('bun-x86_64-pc-windows-msvc.exe');
  });
});

describe('bunDownloadUrl', () => {
  test('pins the workspace Bun version', () => {
    expect(bunDownloadUrl('x86_64-unknown-linux-gnu')).toBe(
      'https://github.com/oven-sh/bun/releases/download/bun-v1.3.11/bun-linux-x64.zip'
    );
  });
});

describe('bunAssetSha256', () => {
  test('pins SHA-256 for every mapped release asset', () => {
    expect(bunAssetSha256('bun-linux-x64.zip')).toBe(BUN_ASSET_SHA256['bun-linux-x64.zip']);
    expect(bunAssetSha256('bun-linux-aarch64.zip')).toBe(BUN_ASSET_SHA256['bun-linux-aarch64.zip']);
    expect(bunAssetSha256('bun-darwin-aarch64.zip')).toBe(
      BUN_ASSET_SHA256['bun-darwin-aarch64.zip']
    );
    expect(bunAssetSha256('bun-darwin-x64.zip')).toBe(BUN_ASSET_SHA256['bun-darwin-x64.zip']);
    expect(bunAssetSha256('bun-windows-x64.zip')).toBe(BUN_ASSET_SHA256['bun-windows-x64.zip']);
  });
});

describe('prepareBun', () => {
  test('copies the extracted binary into the sidecar directory', () => {
    const copied: Array<[string, string]> = [];
    const status = prepareBun({
      binariesDir: '/repo/apps/desktop/src-tauri/binaries',
      required: true,
      target: 'x86_64-unknown-linux-gnu',
      io: {
        copyFile: (source, destination) => {
          copied.push([source, destination]);
        },
        download: () => 0,
        exists: (filePath) => filePath.endsWith('/extract/bun'),
        extract: () => 0,
        hashFile: () => BUN_ASSET_SHA256['bun-linux-x64.zip'],
        mkdir: () => undefined,
        tempDir: () => '/tmp/groam-bun',
        write: () => undefined
      }
    });

    expect(status).toBe(0);
    expect(copied).toEqual([
      [
        '/tmp/groam-bun/extract/bun',
        '/repo/apps/desktop/src-tauri/binaries/bun-x86_64-unknown-linux-gnu'
      ]
    ]);
  });

  test('rejects a required download when the zip checksum does not match', () => {
    let extracted = false;
    const status = prepareBun({
      binariesDir: '/binaries',
      required: true,
      target: 'x86_64-unknown-linux-gnu',
      io: {
        download: () => 0,
        exists: () => false,
        extract: () => {
          extracted = true;
          return 0;
        },
        hashFile: () => '0'.repeat(64),
        mkdir: () => undefined,
        tempDir: () => '/tmp/groam-bun',
        write: () => undefined
      }
    });
    expect(status).toBe(1);
    expect(extracted).toBe(false);
  });

  test('skips download when an optional sidecar already exists', () => {
    let downloaded = false;
    const status = prepareBun({
      binariesDir: '/binaries',
      required: false,
      target: 'x86_64-unknown-linux-gnu',
      io: {
        download: () => {
          downloaded = true;
          return 1;
        },
        exists: () => true,
        mkdir: () => undefined,
        write: () => undefined
      }
    });
    expect(status).toBe(0);
    expect(downloaded).toBe(false);
  });
});
