import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DataSettings } from './data-settings';

vi.mock('@/features/settings/hooks/use-desktop-data', () => ({
  exportGroamData: vi.fn(),
  importGroamData: vi.fn(),
  readGroamDataDir: vi.fn(async () => '/tmp/groam-data')
}));

describe('DataSettings', () => {
  test('shows the local data folder and export actions', async () => {
    await render(<DataSettings />);
    await expect.element(page.getByTestId('settings-data-path')).toBeInTheDocument();
    await expect.element(page.getByTestId('settings-data-export')).toBeInTheDocument();
    await expect.element(page.getByTestId('settings-data-import')).toBeInTheDocument();
    await expect.element(page.getByText('/tmp/groam-data')).toBeInTheDocument();
  });
});
