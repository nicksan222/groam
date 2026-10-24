import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ProposalStatusEvent } from './proposal-status-event';

describe('ProposalStatusEvent', () => {
  test.each([
    ['merged', 'applied this idea.'],
    ['closed', 'closed this idea.']
  ] as const)('describes a %s idea', async (status, copy) => {
    await render(<ProposalStatusEvent authorName="Ada" status={status} />);
    await expect.element(page.getByText('Ada', { exact: true })).toBeVisible();
    await expect.element(page.getByText(copy)).toBeVisible();
    await expect
      .element(page.getByText('This idea is no longer accepting review comments.'))
      .toBeVisible();
  });
});
