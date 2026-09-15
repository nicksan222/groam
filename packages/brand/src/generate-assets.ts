import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import identity from './identity.json';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const workspaceDir = fileURLToPath(new URL('../../..', import.meta.url));
const assetsDir = join(packageDir, 'assets');
const desktopIconsDir = join(workspaceDir, 'apps/desktop/src-tauri/icons');
const webPublicDir = join(workspaceDir, 'apps/web/public');

function markSvg(title = identity.name) {
  const { colors, geometry, size, viewBox } = identity;
  const routes = geometry.routePaths
    .map(
      (path) =>
        `  <path d="${path}" stroke="${colors.paper}" stroke-width="${geometry.routeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  <title>${title}</title>
  <rect width="${size}" height="${size}" rx="${geometry.frameRadius}" fill="${colors.ink}"/>
${routes}
  <circle cx="${geometry.waypoint.cx}" cy="${geometry.waypoint.cy}" r="${geometry.waypoint.radius}" fill="${colors.signal}"/>
</svg>
`;
}

function lockupSvg(wordColor: string, suffix: string) {
  const { colors, geometry, name, size, tagline } = identity;
  const markOffset = 8;
  const markScale = 2.25;
  const frameSize = size * markScale;
  const frameRadius = geometry.frameRadius * markScale;
  const waypointX = markOffset + geometry.waypoint.cx * markScale;
  const waypointY = markOffset + geometry.waypoint.cy * markScale;
  const waypointRadius = geometry.waypoint.radius * markScale;
  const routes = geometry.routePaths
    .map(
      (path) =>
        `  <path d="${path}" stroke="${colors.paper}" stroke-width="${geometry.routeWidth}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${markOffset} ${markOffset}) scale(${markScale})"/>`
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 160" fill="none">
  <title>${name}: ${tagline}</title>
  <rect x="${markOffset}" y="${markOffset}" width="${frameSize}" height="${frameSize}" rx="${frameRadius}" fill="${colors.ink}"/>
${routes}
  <circle cx="${waypointX}" cy="${waypointY}" r="${waypointRadius}" fill="${colors.signal}"/>
  <text x="188" y="103" fill="${wordColor}" font-family="Google Sans Flex, Inter, ui-sans-serif, system-ui, sans-serif" font-size="78" font-weight="650" letter-spacing="-4">${name.toLowerCase()}</text>
  <text x="191" y="134" fill="${wordColor}" fill-opacity="0.62" font-family="Google Sans Flex, Inter, ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="550" letter-spacing="1.5">${tagline.toUpperCase()}</text>
  <!-- generated:${suffix} -->
</svg>
`;
}

async function run(command: string[], cwd = workspaceDir) {
  const process = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' });
  const exitCode = await process.exited;
  if (exitCode !== 0) throw new Error(`Asset command failed (${exitCode}): ${command.join(' ')}`);
}

async function generate() {
  await Promise.all([
    mkdir(assetsDir, { recursive: true }),
    mkdir(webPublicDir, { recursive: true })
  ]);
  const mark = markSvg();
  await Promise.all([
    writeFile(join(assetsDir, 'mark.svg'), mark),
    writeFile(join(assetsDir, 'lockup-light.svg'), lockupSvg(identity.colors.ink, 'light')),
    writeFile(join(assetsDir, 'lockup-dark.svg'), lockupSvg(identity.colors.paper, 'dark')),
    writeFile(join(webPublicDir, 'groam.svg'), mark)
  ]);

  await run(
    [
      'bunx',
      'tauri',
      'icon',
      '../../packages/brand/assets/mark.svg',
      '--output',
      'src-tauri/icons'
    ],
    join(workspaceDir, 'apps/desktop')
  );
  await Promise.all([
    rm(join(desktopIconsDir, '64x64.png'), { force: true }),
    rm(join(desktopIconsDir, 'android'), { recursive: true, force: true }),
    rm(join(desktopIconsDir, 'ios'), { recursive: true, force: true })
  ]);

  const appleDir = join(packageDir, '.generated/apple');
  await mkdir(appleDir, { recursive: true });
  await run(
    [
      'bunx',
      'tauri',
      'icon',
      '../../packages/brand/assets/mark.svg',
      '--output',
      '../../packages/brand/.generated/apple',
      '--png',
      '180'
    ],
    join(workspaceDir, 'apps/desktop')
  );

  await Promise.all([
    copyFile(join(desktopIconsDir, 'icon.png'), join(webPublicDir, 'groam-icon.png')),
    copyFile(join(desktopIconsDir, 'icon.ico'), join(webPublicDir, 'favicon.ico')),
    copyFile(join(appleDir, '180x180.png'), join(webPublicDir, 'apple-touch-icon.png'))
  ]);
  await rm(dirname(appleDir), { recursive: true, force: true });
  console.info('Generated Groam brand assets from packages/brand/src/identity.json');
}

await generate();
