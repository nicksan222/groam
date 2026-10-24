import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DayRangePicker } from './day-range-picker';

test('renders an accessible day strip with selection summary', async () => {
  await render(
    <DayRangePicker
      endDay={4}
      endLabel="Leave"
      label="Lisbon day range"
      maximumDay={7}
      minimumDay={2}
      onChange={vi.fn()}
      startDay={2}
      startLabel="Arrive"
      totalDays={9}
    />
  );

  await expect.element(page.getByRole('group', { name: 'Lisbon day range' })).toBeInTheDocument();
  await expect.element(page.getByText('3 days · Arrive Day 2 · Leave Day 4')).toBeInTheDocument();
  await expect.element(page.getByRole('spinbutton')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: /Earlier|Later/ })).not.toBeInTheDocument();
});

test('paints a stay by clicking two days', async () => {
  const onChange = vi.fn();
  await render(
    <DayRangePicker
      endDay={undefined}
      label="Activity schedule"
      maximumDay={4}
      onChange={onChange}
      startDay={undefined}
    />
  );

  await expect.element(page.getByText(/Click a start day/)).toBeVisible();

  await page.getByRole('button', { name: 'Day 2' }).click();
  expect(onChange).toHaveBeenCalledWith(2, undefined);

  await page.getByRole('button', { name: 'Day 4' }).click();
  expect(onChange).toHaveBeenCalledWith(2, 4);
});

test('clears a single-day selection when the same day is clicked again', async () => {
  const onChange = vi.fn();
  await render(<DayRangePicker endDay={2} maximumDay={4} onChange={onChange} startDay={2} />);

  await page.getByRole('button', { name: 'Day 2, Start and End' }).click();
  expect(onChange).toHaveBeenCalledWith(undefined, undefined);
});

test('releasing a press outside the grid does not paint a later day', async () => {
  const onChange = vi.fn();
  await render(
    <DayRangePicker endDay={undefined} maximumDay={4} onChange={onChange} startDay={undefined} />
  );
  const grid = page.getByTestId('day-range-days').element();
  const first = page.getByRole('button', { name: 'Day 1' }).element();
  const other = page.getByRole('button', { name: 'Day 3' }).element();
  const center = (element: Element) => {
    const box = element.getBoundingClientRect();
    return { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
  };
  grid.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, ...center(first) })
  );
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  grid.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, ...center(other) }));
  expect(onChange).not.toHaveBeenCalled();
});

test('marks other stops as taken and keeps them unselectable', async () => {
  await render(
    <DayRangePicker
      endDay={2}
      maximumDay={5}
      minimumDay={1}
      onChange={vi.fn()}
      startDay={1}
      takenDays={new Set([4, 5])}
      totalDays={5}
    />
  );

  const taken = page.getByRole('button', { name: 'Day 4, Taken' }).element();
  expect(taken.hasAttribute('data-taken')).toBe(true);
  expect(taken.hasAttribute('disabled')).toBe(true);
});
