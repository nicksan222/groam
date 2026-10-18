import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PassOnIdea } from './pass-on-idea';
import type { ProposalDetail } from './proposal-types';

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
  await render(
    <PassOnIdea
      close={close}
      onClosed={onClosed}
      pendingAction={null}
      proposal={proposal()}
      run={run}
      triggerTestId="close-idea-header"
    />
  );

  await page.getByTestId('close-idea-header').click();
  const dialog = page.getByRole('dialog');
  await expect
    .element(dialog.getByRole('heading', { name: 'Delete this draft?' }))
    .toBeInTheDocument();
  await dialog.getByRole('button', { name: 'Delete draft' }).click();
  await vi.waitFor(() => expect(close).toHaveBeenCalledWith(undefined));
  await vi.waitFor(() => expect(onClosed).toHaveBeenCalledOnce());
});

test('requires a reason before closing a submitted idea', async () => {
  await render(
    <PassOnIdea
      close={vi.fn()}
      pendingAction={null}
      proposal={proposal({ status: 'in_review' })}
      run={vi.fn()}
      triggerTestId="close-idea-header"
    />
  );

  await page.getByTestId('close-idea-header').click();
  const dialog = page.getByRole('dialog');
  await expect
    .element(dialog.getByRole('heading', { name: 'Close without applying?' }))
    .toBeInTheDocument();
  await expect.element(dialog.getByLabelText('Why are you closing this idea?')).toBeInTheDocument();
  await expect
    .element(dialog.getByRole('button', { name: 'Close without applying' }))
    .toBeDisabled();
});
