import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { desktopCsp, originFromUrl, tauriCspOverlay } from './csp';

const tauriConf = JSON.parse(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src-tauri/tauri.conf.json'),
    'utf8'
  )
) as { app: { security: { csp: string } } };

describe('desktop CSP', () => {
  test('matches the committed default policy', () => {
    expect(tauriConf.app.security.csp).toBe(desktopCsp());
  });

  test('adds configured Photon and tile origins', () => {
    const csp = desktopCsp({
      mapTilesUrl: 'http://127.0.0.1:8080/styles/osm/{z}/{x}/{y}.png',
      photonUrl: 'http://127.0.0.1:2322'
    });
    expect(csp).toContain('http://127.0.0.1:2322');
    expect(csp).toContain('http://127.0.0.1:8080');
    expect(originFromUrl('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png')).toBe(
      'https://basemaps.cartocdn.com'
    );
  });

  test('overlays CSP for Tauri and can skip the frontend rebuild', () => {
    const overlay = tauriCspOverlay(
      { skipBeforeBuild: true },
      { photonUrl: 'http://127.0.0.1:2322' }
    );
    expect(overlay.build).toEqual({ beforeBuildCommand: '' });
    expect(overlay.app.security.csp).toContain('http://127.0.0.1:2322');
  });
});
