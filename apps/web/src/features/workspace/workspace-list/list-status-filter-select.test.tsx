import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ListStatusFilterSelect } from './list-status-filter-select';

type Status = 'all' | 'open' | 'closed';
const labels: Record<Status, string> = { all: 'All', closed: 'Closed', open: 'Open' };
const options = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' }
] as const;

describe('ListStatusFilterSelect', () => {
  test.each<[Status, boolean | undefined]>([
    ['all', undefined],
    ['open', true]
  ])('shows the label for %s (hasValue=%s)', async (value, hasValue) => {
    await render(
      <ListStatusFilterSelect<Status>
        ariaLabel="Status filter"
        hasValue={hasValue}
        labels={labels}
        onChange={vi.fn()}
        options={options}
        testId="status-filter"
        value={value}
      />
    );
    const trigger = page.getByRole('combobox', { name: 'Status filter' });
    await expect.element(trigger).toHaveTextContent(labels[value]);
    if (hasValue) await expect.element(trigger).toHaveAttribute('data-has-value', 'true');
    else await expect.element(trigger).not.toHaveAttribute('data-has-value');
  });

  test('lists every option and reports the chosen one', async () => {
    const onChange = vi.fn();
    await render(
      <ListStatusFilterSelect<Status>
        ariaLabel="Status filter"
        labels={labels}
        onChange={onChange}
        options={options}
        value="all"
      />
    );
    await page.getByRole('combobox', { name: 'Status filter' }).click();
    for (const label of ['All', 'Open', 'Closed']) {
      await expect.element(page.getByRole('option', { name: label })).toBeVisible();
    }
    await page.getByRole('option', { name: 'Closed' }).click();
    expect(onChange).toHaveBeenCalledWith('closed');
  });
});
