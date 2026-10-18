import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CreateOrganizationDialog } from './create-organization-dialog';

const { activate, create } = vi.hoisted(() => ({ activate: vi.fn(), create: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: { organization: { create } }
}));

vi.mock('@/features/workspace/hooks/use-organization-activation', () => ({
  activateOrganization: activate
}));

beforeEach(() => {
  activate.mockReset();
  activate.mockResolvedValue(undefined);
  create.mockReset();
  create.mockResolvedValue({ data: { id: 'new-group' }, error: null });
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
      keepCurrentActiveOrganization: true,
      name: 'The Smiths',
      slug: expect.stringMatching(/^the-smiths/)
    });
    expect(activate).toHaveBeenCalledWith('new-group');
  });

  test('waits for activation before closing the dialog', async () => {
    let finishActivation = () => {};
    activate.mockReturnValue(
      new Promise<void>((resolve) => {
        finishActivation = resolve;
      })
    );
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await page.getByLabelText('Name').fill('Smiths');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect.poll(() => activate.mock.calls.length).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
    finishActivation();
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
  });

  test('keeps the dialog open when the created group cannot be activated', async () => {
    activate.mockRejectedValue(new Error('Unable to activate workspace'));
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await page.getByLabelText('Name').fill('Smiths');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect.element(page.getByText('Unable to activate workspace')).toBeVisible();
    expect(create).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
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
    expect(activate).not.toHaveBeenCalled();
  });

  test('cancel closes the dialog', async () => {
    const onClose = vi.fn();
    await render(<CreateOrganizationDialog onClose={onClose} open />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(onClose).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
