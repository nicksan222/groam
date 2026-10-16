import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CreateOrganizationDialog } from './create-organization-dialog';

const create = vi.hoisted(() => vi.fn());

vi.mock('@groam/auth/client', () => ({
  authClient: { organization: { create } }
}));

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ data: {}, error: null });
});

describe('CreateOrganizationDialog', () => {
  test('renders nothing while closed', async () => {
    await render(<CreateOrganizationDialog onClose={vi.fn()} open={false} />);
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });

  test('creates a group with a trimmed name and a slug, then closes', async () => {
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await expect.element(page.getByRole('heading', { name: 'New group' })).toBeVisible();
    await page.getByLabelText('Name').fill('  The Smiths ');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
    expect(create).toHaveBeenCalledWith({
      name: 'The Smiths',
      slug: expect.stringMatching(/^the-smiths/)
    });
  });

  test('does not submit a blank name', async () => {
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await page.getByLabelText('Name').fill('   ');
    await page.getByRole('button', { name: 'Create group' }).click();
    expect(create).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each([
    [
      'an auth error response',
      () => create.mockResolvedValue({ error: { message: 'Slug taken' } }),
      'Slug taken'
    ],
    ['a thrown error', () => create.mockRejectedValue(new Error('Network down')), 'Network down']
  ])('shows %s and stays open', async (_, arrange, message) => {
    arrange();
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await page.getByLabelText('Name').fill('Smiths');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect.element(page.getByText(message)).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('cancel closes the dialog', async () => {
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(onClose).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
