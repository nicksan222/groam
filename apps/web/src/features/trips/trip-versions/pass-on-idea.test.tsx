import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PassOnIdea } from './pass-on-idea';
import type { ProposalDetail } from './proposal-types';

afterEach(cleanup);

function proposal(overrides: Partial<ProposalDetail> = {}): ProposalDetail {
  return {
    canClose: true,
    status: 'draft',
    ...overrides
  } as ProposalDetail;
}

test('confirms before deleting a draft', async () => {
  const close = vi.fn(async () => true);
  const onClosed = vi.fn();
  const run = vi.fn(async (_action: string, action: () => Promise<boolean>) => action());
  render(
    <PassOnIdea
      close={close}
      onClosed={onClosed}
      pendingAction={null}
      proposal={proposal()}
      run={run}
      triggerTestId="close-idea-header"
    />
  );

  fireEvent.click(screen.getByTestId('close-idea-header'));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: 'Delete this draft?' })).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete draft' }));
  await vi.waitFor(() => expect(close).toHaveBeenCalledWith(undefined));
  await vi.waitFor(() => expect(onClosed).toHaveBeenCalledOnce());
});

test('requires a reason before closing a submitted idea', () => {
  render(
    <PassOnIdea
      close={vi.fn()}
      pendingAction={null}
      proposal={proposal({ status: 'in_review' })}
      run={vi.fn()}
      triggerTestId="close-idea-header"
    />
  );

  fireEvent.click(screen.getByTestId('close-idea-header'));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: 'Close without applying?' })).toBeTruthy();
  expect(
    within(dialog).getByLabelText('Why are you closing this idea?').getAttribute('aria-required')
  ).toBe('true');
  expect(within(dialog).getByRole('button', { name: 'Close without applying' })).toHaveProperty(
    'disabled',
    true
  );
});
