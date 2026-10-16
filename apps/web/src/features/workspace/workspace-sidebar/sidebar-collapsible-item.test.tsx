import { SidebarMenuButton, SidebarProvider } from '@groam/ui/components/sidebar';
import { SidebarCollapsibleItem } from '@groam/ui/components/sidebar-collapsible-item';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useSidebarSectionOpen } from '@/features/workspace/hooks/use-sidebar-section-open';
import { resetSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';

function Harness({
  child = 'Child item',
  sectionActive
}: {
  child?: string;
  sectionActive: boolean;
}) {
  const [open, setOpen] = useSidebarSectionOpen('trips');
  return (
    <SidebarProvider>
      <ul>
        <SidebarCollapsibleItem
          label="trips"
          data-active={sectionActive}
          onOpenChange={setOpen}
          open={open}
          trigger={
            <SidebarMenuButton asChild>
              <a href="#trips">Trips</a>
            </SidebarMenuButton>
          }
        >
          <li>{child}</li>
        </SidebarCollapsibleItem>
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  resetSidebarChromeStore();
});

test('stays collapsed when the section is not active', async () => {
  await render(<Harness sectionActive={false} />);
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Expand trips' }))
    .toHaveAttribute('aria-expanded', 'false');
});

test('the hover action toggles children without following the parent link', async () => {
  await render(<Harness sectionActive={true} />);

  await page.getByRole('link', { name: 'Trips' }).click();
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Expand trips' }).click();
  await expect.element(page.getByText('Child item')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Collapse trips' }).click();
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Expand trips' }))
    .toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Expand trips' }).click();
  await expect.element(page.getByText('Child item')).toBeInTheDocument();
});

test('keeps the sidebar quiet when navigating into a section', async () => {
  const { rerender } = await render(<Harness sectionActive={false} />);
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();

  await rerender(<Harness sectionActive={true} />);
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Expand trips' })).toBeInTheDocument();
});
