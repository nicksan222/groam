import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { IssueStatusBar } from './issue-status-bar';

const tones = [
  ['open', 'text-info-foreground'],
  ['in_progress', 'text-warning-foreground'],
  ['closed', 'text-success-foreground'],
  ['wont_do', 'text-muted-foreground']
] as const;

describe('IssueStatusBar', () => {
  test.each(tones)('draws a %s bar in its tone', async (status, tone) => {
    const { container } = await render(<IssueStatusBar status={status} />);
    const bar = container.querySelector(`[data-status="${status}"]`);
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(bar?.classList.contains(tone)).toBe(true);
    expect(bar?.classList.contains('bg-current')).toBe(true);
  });

  test('takes extra classes', async () => {
    const { container } = await render(<IssueStatusBar className="w-16" status="open" />);
    expect(container.querySelector('[data-status="open"]')?.classList.contains('w-16')).toBe(true);
  });
});
