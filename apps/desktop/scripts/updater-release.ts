import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const configPath = path.join(root, 'apps/desktop/src-tauri/tauri.conf.json');

const platforms = [
  ['linux-x86_64', '.AppImage'],
  ['darwin-aarch64', '.app.tar.gz'],
  ['windows-x86_64', '-setup.exe']
] as const;

/** CI stamps `0.1.<run>` into tauri.conf.json so each release sorts above the last. */
export const releaseVersion = (configVersion: string, buildNumber: string): string => {
  const match = /^(\d+\.\d+)\./u.exec(configVersion);
  if (!match || !/^\d+$/u.test(buildNumber)) {
    throw new Error(`Cannot derive release version from ${configVersion} and ${buildNumber}`);
  }
  return `${match[1]}.${Number(buildNumber)}`;
};

function stampDesktopVersion(buildNumber: string): string {
  const source = readFileSync(configPath, 'utf8');
  const config = JSON.parse(source) as { version: string };
  const version = releaseVersion(config.version, buildNumber);
  writeFileSync(
    configPath,
    source.replace(`"version": "${config.version}"`, `"version": "${version}"`)
  );
  writeFileSync(path.join(root, 'apps/desktop/src-tauri/desktop-version.txt'), `${version}\n`);
  return version;
}

function signedArtifacts(directory: string) {
  const artifacts: { name: string; signature: string }[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.sig')) {
        artifacts.push({
          name: entry.name.slice(0, -4),
          signature: readFileSync(fullPath, 'utf8').trim()
        });
      }
    }
  };
  walk(directory);
  return artifacts;
}

export function writeLatestJson(options: {
  directory: string;
  repository: string;
  tag: string;
  version: string;
}) {
  const artifacts = signedArtifacts(options.directory);
  const assetUrl = (name: string) =>
    `https://github.com/${options.repository}/releases/download/${options.tag}/${encodeURIComponent(name)}`;
  const manifestPlatforms: Record<string, { signature: string; url: string }> = {};

  for (const [platform, suffix] of platforms) {
    const matches = artifacts.filter((artifact) => artifact.name.endsWith(suffix));
    if (matches.length !== 1 || !matches[0].signature) {
      throw new Error(`Expected one signed ${suffix} bundle for ${platform}`);
    }
    manifestPlatforms[platform] = {
      signature: matches[0].signature,
      url: assetUrl(matches[0].name)
    };
  }

  writeFileSync(
    path.join(options.directory, 'latest.json'),
    `${JSON.stringify(
      {
        version: options.version,
        notes: '',
        pub_date: new Date().toISOString(),
        platforms: manifestPlatforms
      },
      null,
      2
    )}\n`
  );
}

if (import.meta.main) {
  const [command, argument] = process.argv.slice(2);
  if (command === 'stamp') {
    if (!argument) process.exit(1);
    console.info(stampDesktopVersion(argument));
  } else if (command === 'manifest') {
    const [directory, repository, tag, version] = process.argv.slice(3);
    if (!directory || !repository || !tag || !version) {
      process.exit(1);
    }
    writeLatestJson({ directory, repository, tag, version });
  } else {
    process.exit(1);
  }
}
