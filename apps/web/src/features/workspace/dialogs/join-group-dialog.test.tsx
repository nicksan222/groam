import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { JoinGroupDialog } from './join-group-dialog';

const join = vi.hoisted(() => ({
  code: '',
  error: null as string | null,
  hasPendingActivation: false,
  isPending: false,
  setCode: vi.fn(),
  submit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
}));
const useJoinGroup = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/hooks/use-join-group', () => ({ useJoinGroup }));

beforeEach(() => {
  join.code = '';
  join.error = null;
  join.hasPendingActivation = false;
  join.isPending = false;
  join.setCode.mockClear();
  join.submit.mockClear();
  useJoinGroup.mockReset();
  useJoinGroup.mockImplementation(() => join);
});

describe('JoinGroupDialog', () => {
  test('passes onClose as the joined callback', async () => {
    const onClose = vi.fn();
    await render(<JoinGroupDialog onClose={onClose} open />);
    expect(useJoinGroup).toHaveBeenCalledWith({ onJoined: onClose });
  });

  test('renders nothing while closed', async () => {
    await render(<JoinGroupDialog onClose={vi.fn()} open={false} />);
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });

  test('disables joining until a code is typed', async () => {
    await render(<JoinGroupDialog onClose={vi.fn()} open />);
    await expect.element(page.getByRole('button', { name: 'Join group' })).toBeDisabled();
  });

  test('forwards typed codes and enables joining with a code', async () => {
    join.code = 'ABCD';
    await render(<JoinGroupDialog onClose={vi.fn()} open />);
    await page.getByLabelText('Invitation code').fill('X');
    expect(join.setCode).toHaveBeenCalledWith('X');
    await page.getByRole('button', { name: 'Join group' }).click();
    expect(join.submit).toHaveBeenCalled();
  });

  test('offers to open the group when activation is pending', async () => {
    join.hasPendingActivation = true;
    await render(<JoinGroupDialog onClose={vi.fn()} open />);
    await expect.element(page.getByLabelText('Invitation code')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Open group' })).toBeEnabled();
  });

  test('disables the form while pending', async () => {
    join.isPending = true;
    join.code = 'ABCD';
    await render(<JoinGroupDialog onClose={vi.fn()} open />);
    await expect.element(page.getByLabelText('Invitation code')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  test('shows the join error', async () => {
    join.error = 'Invalid code';
    await render(<JoinGroupDialog onClose={vi.fn()} open />);
    await expect.element(page.getByText('Invalid code')).toBeVisible();
  });

  test('cancel closes', async () => {
    const onClose = vi.fn();
    await render(<JoinGroupDialog onClose={onClose} open />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
