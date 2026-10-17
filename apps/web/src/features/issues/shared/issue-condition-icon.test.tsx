import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { IssueConditionIcon } from './issue-condition-icon';

describe('IssueConditionIcon', () => {
  test.each<[string, { manual?: boolean; met: boolean | null }, string]>([
    ['a met check', { met: true }, 'lucide-circle-check'],
    ['a pending check', { met: false }, 'lucide-flag'],
    ['an unknown state', { met: null }, 'lucide-flag'],
    ['a hand-written condition', { manual: true, met: null }, 'lucide-pen-line'],
    ['a hand-written condition even when met', { manual: true, met: true }, 'lucide-pen-line']
  ])('draws %s', async (_, props, glyph) => {
    const { container } = await render(<IssueConditionIcon className="size-3" {...props} />);
    const icon = container.querySelector('svg');
    expect(icon?.classList.contains(glyph)).toBe(true);
    expect(icon?.classList.contains('size-3')).toBe(true);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
