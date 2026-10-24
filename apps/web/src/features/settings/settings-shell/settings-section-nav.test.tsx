import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { SettingsSectionNav as SettingsSectionNavComponent } from './settings-section-nav';

function SettingsSectionNav(props: ComponentProps<typeof SettingsSectionNavComponent>) {
  return (
    <SidebarProvider>
      <SettingsSectionNavComponent {...props} />
    </SidebarProvider>
  );
}

describe('SettingsSectionNav', () => {
  test('renders a control per section', async () => {
    await render(<SettingsSectionNav activeSection="profile" onSectionChange={vi.fn()} />);
    await expect.element(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
    for (const title of ['Profile', 'Appearance', 'Group', 'Security', 'AI']) {
      await expect.element(page.getByRole('button', { name: title, exact: true })).toBeVisible();
    }
    await expect.element(page.getByText('Data', { exact: true })).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Profile', exact: true }))
      .toHaveAttribute('aria-current', 'page');
    await expect
      .element(page.getByRole('button', { name: 'Security', exact: true }))
      .not.toHaveAttribute('aria-current');
  });

  test('uses a section picker on phones', async () => {
    await useViewport(390, 844);
    const onSectionChange = vi.fn();
    await render(<SettingsSectionNav activeSection="profile" onSectionChange={onSectionChange} />);
    await page.getByRole('combobox', { name: 'Settings section', exact: true }).click();
    await page.getByRole('option', { name: 'Security', exact: true }).click();
    expect(onSectionChange).toHaveBeenCalledWith('security');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
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
