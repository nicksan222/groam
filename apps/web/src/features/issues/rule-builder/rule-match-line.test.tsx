import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RuleMatchLine } from './rule-match-line';

describe('RuleMatchLine', () => {
  test('wraps the select in its prefix and suffix', async () => {
    await render(
      <RuleMatchLine
        label="Match"
        match="any"
        onChange={vi.fn()}
        prefix="This is done when"
        suffix="of these are true"
      />
    );
    await expect.element(page.getByText('This is done when')).toBeVisible();
    await expect.element(page.getByText('of these are true')).toBeVisible();
    await expect.element(page.getByLabelText('Match')).toHaveTextContent('any');
  });

  test('omits the prefix when none is given', async () => {
    await render(<RuleMatchLine label="Match" match="all" onChange={vi.fn()} suffix="of these" />);
    await expect.element(page.getByText('of these')).toBeVisible();
    expect(page.getByText('This is done when').elements()).toHaveLength(0);
  });

  test('offers all, any and none and reports the choice', async () => {
    const onChange = vi.fn();
    await render(<RuleMatchLine label="Match" match="all" onChange={onChange} suffix="of these" />);
    await page.getByLabelText('Match').click();
    for (const name of ['all', 'any', 'none']) {
      await expect.element(page.getByRole('option', { name })).toBeVisible();
    }
    await page.getByRole('option', { name: 'none' }).click();
    expect(onChange).toHaveBeenCalledWith('none');
  });

  test('disables the select', async () => {
    await render(
      <RuleMatchLine disabled label="Match" match="all" onChange={vi.fn()} suffix="of these" />
    );
    await expect.element(page.getByLabelText('Match')).toBeDisabled();
  });
});
