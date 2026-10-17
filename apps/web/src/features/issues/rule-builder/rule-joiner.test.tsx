import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RuleJoiner } from './rule-joiner';

describe('RuleJoiner', () => {
  test('shows its word but hides it from assistive tech', async () => {
    await render(<RuleJoiner word="and" />);
    await expect.element(page.getByText('and')).toBeVisible();
    await expect.element(page.getByText('and')).toHaveAttribute('aria-hidden', 'true');
    expect(page.getByRole('generic', { name: 'and' }).elements()).toHaveLength(0);
  });
});
