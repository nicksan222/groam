import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ConversationEmpty } from './conversation-empty';
import type { VersionStatus } from './proposal-types';

describe('ConversationEmpty', () => {
  test.each<[boolean, VersionStatus, string]>([
    [false, 'closed', 'This idea closed without a review conversation.'],
    [true, 'draft', 'Leave a note, or send this idea for review'],
    [true, 'in_review', 'Ask a question or suggest a change to start the conversation.']
  ])('accepting=%s status=%s', async (acceptingComments, status, copy) => {
    await render(<ConversationEmpty acceptingComments={acceptingComments} status={status} />);
    await expect.element(page.getByText('No comments yet')).toBeVisible();
    await expect.element(page.getByText(copy, { exact: false })).toBeVisible();
  });
});
