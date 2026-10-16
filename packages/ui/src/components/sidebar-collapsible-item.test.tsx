import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SidebarCollapsibleItem } from './sidebar-collapsible-item';

function Harness({
  child = 'Child item',
  open,
  onOpenChange
}: {
  child?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <SidebarProvider>
      <ul>
        <SidebarCollapsibleItem
          label="trips"
          onOpenChange={onOpenChange}
          open={open}
          trigger={<a href="#trips">Trips</a>}
        >
          <li>{child}</li>
        </SidebarCollapsibleItem>
      </ul>
    </SidebarProvider>
  );
}

test('hides children while collapsed', async () => {
  await render(<Harness onOpenChange={vi.fn()} open={false} />);
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Expand trips' }))
    .toHaveAttribute('aria-expanded', 'false');
});

test('the hover action toggles children without following the parent link', async () => {
  const onOpenChange = vi.fn();
  const { rerender } = await render(<Harness onOpenChange={onOpenChange} open={true} />);

  await expect.element(page.getByText('Child item')).toBeInTheDocument();
  await page.getByRole('link', { name: 'Trips' }).click();
  expect(onOpenChange).not.toHaveBeenCalled();

  await page.getByRole('button', { name: 'Collapse trips' }).click();
  expect(onOpenChange).toHaveBeenCalledWith(false);

  await rerender(<Harness onOpenChange={onOpenChange} open={false} />);
  // The collapse animates out before the content unmounts.
  await expect.element(page.getByText('Child item')).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Expand trips' }))
    .toHaveAttribute('aria-expanded', 'false');
});
