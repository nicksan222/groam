import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IssueComment } from './issue-comment';

const threeDaysAgo = Date.now() - 3 * 86_400_000;

describe('IssueComment', () => {
  test('shows the author, relative time, and body', async () => {
    await render(
      <IssueComment authorName="Sam Planner" body="Let's go west." timestamp={threeDaysAgo} />
    );
    await expect.element(page.getByText('Sam Planner')).toBeVisible();
    await expect.element(page.getByText("Let's go west.")).toBeVisible();
    await expect.element(page.getByText('3 days ago')).toBeVisible();
    await expect.element(page.getByText('SP')).toBeInTheDocument();
  });

  test.each<[boolean, boolean]>([
    [true, true],
    [false, false]
  ])('author badge when isAuthor is %s', async (isAuthor, visible) => {
    await render(
      <IssueComment
        authorName="Sam Planner"
        body="Hi"
        isAuthor={isAuthor}
        timestamp={threeDaysAgo}
      />
    );
    if (visible) await expect.element(page.getByText('Author')).toBeVisible();
    else await expect.element(page.getByText('Author')).not.toBeInTheDocument();
  });

  test.each(['', '   \n'])('falls back for a blank body (%j)', async (body) => {
    await render(<IssueComment authorName="Sam Planner" body={body} timestamp={threeDaysAgo} />);
    await expect.element(page.getByText('No description provided.')).toBeVisible();
  });
});
