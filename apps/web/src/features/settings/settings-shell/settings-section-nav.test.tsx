import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { SettingsSectionNav } from './settings-section-nav';

describe('SettingsSectionNav', () => {
  test('renders a tab per section', async () => {
    await render(<SettingsSectionNav activeSection="profile" onSectionChange={vi.fn()} />);
    await expect.element(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
    for (const title of ['Profile', 'Appearance', 'Group', 'Security', 'AI']) {
      await expect.element(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect.element(page.getByText('Data', { exact: true })).not.toBeInTheDocument();
  });

  test.each([
    ['Security', testIds.settingsSectionSecurity, 'security'],
    ['AI', testIds.settingsSectionAi, 'ai'],
    ['Group', testIds.settingsSectionGroup, 'group']
  ])('selecting %s reports its section', async (_, testId, section) => {
    const onSectionChange = vi.fn();
    await render(<SettingsSectionNav activeSection="profile" onSectionChange={onSectionChange} />);
    await page.getByTestId(testId).click();
    expect(onSectionChange).toHaveBeenCalledWith(section);
  });
});
