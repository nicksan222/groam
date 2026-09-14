import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { releaseVersion, writeLatestJson } from './updater-release';

describe('releaseVersion', () => {
  test('appends the CI run number to the committed release line', () => {
    expect(releaseVersion('0.1.0', '61')).toBe('0.1.61');
  });
});

describe('writeLatestJson', () => {
  test('maps signed bundles to updater platform keys', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'groam-manifest-'));
    for (const name of ['Groam.AppImage', 'Groam.app.tar.gz', 'Groam-setup.exe']) {
      writeFileSync(path.join(dir, name), 'bundle');
      writeFileSync(path.join(dir, `${name}.sig`), `sig-${name}`);
    }

    writeLatestJson({
      directory: dir,
      repository: 'groam/groam',
      tag: 'v0.1.61',
      version: '0.1.61'
    });

    const manifest = JSON.parse(readFileSync(path.join(dir, 'latest.json'), 'utf8')) as {
      platforms: Record<string, { url: string }>;
    };
    expect(Object.keys(manifest.platforms).sort()).toEqual([
      'darwin-aarch64',
      'linux-x86_64',
      'windows-x86_64'
    ]);
    expect(manifest.platforms['linux-x86_64'].url).toContain('Groam.AppImage');

    rmSync(dir, { force: true, recursive: true });
  });
});
