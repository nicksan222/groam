import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DataSettings } from './data-settings';

vi.mock('@/features/settings/hooks/use-desktop-data', () => ({
  exportGroamData: vi.fn(),
  importGroamData: vi.fn(),
  readGroamDataDir: vi.fn(async () => '/tmp/groam-data')
}));

afterEach(() => cleanup());

describe('DataSettings', () => {
  test('shows the local data folder and export actions', async () => {
    render(<DataSettings />);
    expect(await screen.findByTestId('settings-data-path')).toBeTruthy();
    expect(screen.getByTestId('settings-data-export')).toBeTruthy();
    expect(screen.getByTestId('settings-data-import')).toBeTruthy();
    expect(await screen.findByText('/tmp/groam-data')).toBeTruthy();
  });
});
