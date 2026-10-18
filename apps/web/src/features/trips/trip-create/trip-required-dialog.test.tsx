import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripRequiredDialog } from './trip-required-dialog';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    onClick,
    to
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    to: string;
  }) => (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  )
}));

describe('copy by purpose', () => {
  test.each([
    ['idea', 'Ideas suggest changes to a shared trip.'],
    ['issue', 'Issues keep decisions and questions attached to a trip.']
  ] as const)('explains the %s case', async (purpose, text) => {
    await render(<TripRequiredDialog onClose={vi.fn()} open purpose={purpose} />);
    await expect.element(page.getByText('Start with a trip')).toBeVisible();
    await expect.element(page.getByText(text, { exact: false })).toBeVisible();
  });
});

describe('actions', () => {
  test('Cancel closes the dialog', async () => {
    const onClose = vi.fn();
    await render(<TripRequiredDialog onClose={onClose} open purpose="idea" />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Go to trips links to /trips and closes', async () => {
    const onClose = vi.fn();
    await render(<TripRequiredDialog onClose={onClose} open purpose="issue" />);
    const link = page.getByRole('link', { name: 'Go to trips' });
    await expect.element(link).toHaveAttribute('href', '/trips');
    await link.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('is not rendered while closed', async () => {
    await render(<TripRequiredDialog onClose={vi.fn()} open={false} purpose="idea" />);
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });
});
