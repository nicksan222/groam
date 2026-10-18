import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { JoinFirstGroupForm } from './join-first-group-form';

const join = vi.hoisted(() => ({
  code: '',
  error: null as string | null,
  hasPendingActivation: false,
  isPending: false,
  setCode: vi.fn(),
  submit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
}));

vi.mock('@/features/workspace/hooks/use-join-group', () => ({ useJoinGroup: () => join }));

beforeEach(() => {
  join.code = '';
  join.error = null;
  join.hasPendingActivation = false;
  join.isPending = false;
  join.setCode.mockClear();
  join.submit.mockClear();
});

describe('JoinFirstGroupForm', () => {
  test('disables joining until a code is typed', async () => {
    await render(<JoinFirstGroupForm />);
    await expect.element(page.getByRole('button', { name: 'Join group' })).toBeDisabled();
  });

  test('forwards typing and submits with a code', async () => {
    join.code = 'ABCD';
    await render(<JoinFirstGroupForm />);
    await page.getByLabelText('Invitation code').fill('Z');
    expect(join.setCode).toHaveBeenCalledWith('Z');
    await page.getByRole('button', { name: 'Join group' }).click();
    expect(join.submit).toHaveBeenCalled();
  });

  test('offers to open the group when activation is pending', async () => {
    join.hasPendingActivation = true;
    await render(<JoinFirstGroupForm />);
    await expect.element(page.getByLabelText('Invitation code')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Open group' })).toBeEnabled();
  });

  test('disables everything while pending', async () => {
    join.isPending = true;
    join.code = 'ABCD';
    await render(<JoinFirstGroupForm />);
    await expect.element(page.getByLabelText('Invitation code')).toBeDisabled();
    await expect.element(page.getByRole('button')).toBeDisabled();
  });

  test('shows an error', async () => {
    join.error = 'Code expired';
    await render(<JoinFirstGroupForm />);
    await expect.element(page.getByText('Code expired')).toBeVisible();
  });
});
