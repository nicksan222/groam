import { beforeEach, describe, expect, test, vi } from 'vitest';
import { exportGroamData, importGroamData, readGroamDataDir } from './use-desktop-data';

const desktop = vi.hoisted(() => ({
  env: { isDesktop: false, mode: 'development' },
  invoke: vi.fn()
}));

vi.mock('@groam/env/web-client', () => ({ env: desktop.env }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: desktop.invoke }));

beforeEach(() => {
  vi.clearAllMocks();
  desktop.env.isDesktop = false;
  desktop.env.mode = 'development';
});

describe('desktop data commands', () => {
  test('rejects export and restore outside the desktop app', async () => {
    await expect(readGroamDataDir()).rejects.toThrow(
      'Data export is only available in the desktop app.'
    );
    await expect(importGroamData()).rejects.toThrow(
      'Data restore is only available in the desktop app.'
    );
    expect(desktop.invoke).not.toHaveBeenCalled();
  });

  test('rejects development desktop sessions before invoking Tauri', async () => {
    desktop.env.isDesktop = true;
    await expect(exportGroamData()).rejects.toThrow('only available in the packaged Groam app');
    expect(desktop.invoke).not.toHaveBeenCalled();
  });

  test('invokes the packaged desktop commands', async () => {
    desktop.env.isDesktop = true;
    desktop.env.mode = 'production';
    desktop.invoke
      .mockResolvedValueOnce('/data/groam')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(readGroamDataDir()).resolves.toBe('/data/groam');
    await expect(exportGroamData()).resolves.toBe(true);
    await expect(importGroamData()).resolves.toBe(false);
    expect(desktop.invoke).toHaveBeenNthCalledWith(1, 'groam_data_dir_path');
    expect(desktop.invoke).toHaveBeenNthCalledWith(2, 'export_groam_data');
    expect(desktop.invoke).toHaveBeenNthCalledWith(3, 'import_groam_data');
  });
});
