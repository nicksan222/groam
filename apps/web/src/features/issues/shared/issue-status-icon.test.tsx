import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import type { IssueStatus } from '@/types/issues';
import { IssueStatusIcon } from './issue-status-icon';

describe('IssueStatusIcon', () => {
  test.each<[IssueStatus, string]>([
    ['open', 'text-info-foreground'],
    ['in_progress', 'text-warning-foreground'],
    ['closed', 'text-success-foreground'],
    ['wont_do', 'text-muted-foreground']
  ])('draws %s in its tone and hides it from assistive tech', async (status, tone) => {
    const { container } = await render(<IssueStatusIcon status={status} />);
    const icon = container.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('class')).toContain(tone);
    expect(icon?.getAttribute('class')).toContain('size-4');
  });

  test('accepts an extra class name', async () => {
    const { container } = await render(<IssueStatusIcon className="size-3" status="open" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('size-3');
  });
});
