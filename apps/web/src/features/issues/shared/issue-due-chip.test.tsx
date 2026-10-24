import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueStatus } from '@/types/issues';
import { IssueDueChip } from './issue-due-chip';

const day = 24 * 60 * 60 * 1000;
const chip = () => page.getByTestId(testIds.issueDueChip);

describe('IssueDueChip', () => {
  test.each<[string, number, IssueStatus, boolean]>([
    ['an active issue past its date', -day, 'open', true],
    ['an active issue before its date', day, 'in_progress', false],
    ['a closed issue past its date', -day, 'closed', false],
    ["a won't do issue past its date", -day, 'wont_do', false]
  ])('%s', async (_name, offset, status, overdue) => {
    await render(<IssueDueChip dueAt={Date.now() + offset} status={status} />);

    const text = chip().element().textContent;
    expect(text).toContain('Decide by');
    expect(text?.includes('Overdue')).toBe(overdue);
    expect(chip().element().hasAttribute('data-overdue')).toBe(overdue);
  });

  test('an overdue chip says so in words, with the date', async () => {
    await render(<IssueDueChip dueAt={Date.now() - day} status="open" />);
    expect(chip().element().textContent).toMatch(/Overdue · \w+ \d+/u);
  });

  test('a label writes the verb out', async () => {
    await render(<IssueDueChip dueAt={Date.now() + day} label="Closes" status="open" />);
    expect(chip().element().textContent).toMatch(/^Closes \w+ \d+/u);
  });
});
