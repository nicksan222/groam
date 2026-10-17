import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import identity from './identity.json';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const workspaceDir = fileURLToPath(new URL('../../..', import.meta.url));
const assetsDir = join(packageDir, 'assets');
const webPublicDir = join(workspaceDir, 'apps/web/public');

/** Inner mark markup: the agent pin is masked where the human pin overlaps it. */
function markBody(id: string) {
  const { colors, geometry, size } = identity;
  return `  <defs>
    <mask id="${id}-gap" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${colors.maskKeep}"/>
      <path d="${geometry.humanPin}" fill="${colors.maskCut}" stroke="${colors.maskCut}" stroke-width="${geometry.pinGap * 2}" stroke-linejoin="round"/>
    </mask>
  </defs>
  <rect width="${size}" height="${size}" rx="${geometry.frameRadius}" fill="${colors.frame}"/>
  <path d="${geometry.agentPin}" fill="${colors.signal}" mask="url(#${id}-gap)"/>
  <path d="${geometry.humanPin}${geometry.humanHole}" fill="${colors.paper}" fill-rule="evenodd"/>`;
}

function markSvg(title = identity.name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${identity.viewBox}" fill="none">
  <title>${title}</title>
${markBody('groam-mark')}
</svg>
`;
}

function lockupSvg(wordColor: string, suffix: string) {
  const { name, tagline, viewBox } = identity;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 160" fill="none">
  <title>${name}: ${tagline}</title>
  <svg x="8" y="8" width="144" height="144" viewBox="${viewBox}">
${markBody(`groam-lockup-${suffix}`)}
  </svg>
  <text x="188" y="103" fill="${wordColor}" font-family="Google Sans Flex, Inter, ui-sans-serif, system-ui, sans-serif" font-size="78" font-weight="650" letter-spacing="-4">${name.toLowerCase()}</text>
  <text x="191" y="134" fill="${wordColor}" fill-opacity="0.62" font-family="Google Sans Flex, Inter, ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="550" letter-spacing="1.5">${tagline.toUpperCase()}</text>
  <!-- generated:${suffix} -->
</svg>
`;
}

const FAVICON_SIZES = [16, 24, 32, 48, 64, 256];

function renderPng(svg: string, size: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

/** Packs PNG images into one ICO file; every modern browser reads PNG entries. */
function encodeIco(images: { png: Buffer; size: number }[]): Buffer {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ png, size }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
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
    writeFile(join(assetsDir, 'lockup-dark.svg'), lockupSvg(identity.colors.night, 'dark')),
    writeFile(join(webPublicDir, 'groam.svg'), mark)
  ]);

  await Promise.all([
    writeFile(join(webPublicDir, 'groam-icon.png'), renderPng(mark, 512)),
    writeFile(join(webPublicDir, 'apple-touch-icon.png'), renderPng(mark, 180)),
    writeFile(
      join(webPublicDir, 'favicon.ico'),
      encodeIco(FAVICON_SIZES.map((size) => ({ png: renderPng(mark, size), size })))
    )
  ]);
  console.info('Generated Groam brand assets from packages/brand/src/identity.json');
}

await generate();
