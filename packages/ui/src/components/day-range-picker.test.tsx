import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DayRangePicker } from './day-range-picker';

afterEach(cleanup);

test('renders an accessible day strip with selection summary', () => {
  render(
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

  expect(screen.getByRole('group', { name: 'Lisbon day range' })).toBeDefined();
  expect(screen.getByText('3 days · Arrive Day 2 · Leave Day 4')).toBeDefined();
  expect(screen.queryByRole('spinbutton')).toBeNull();
  expect(screen.queryByRole('button', { name: /Earlier|Later/ })).toBeNull();
});

test('paints a stay by clicking two days', () => {
  const onChange = vi.fn();
  const view = render(
    <DayRangePicker
      endDay={undefined}
      label="Activity schedule"
      maximumDay={4}
      onChange={onChange}
      startDay={undefined}
    />
  );

  expect(within(view.container).getByText(/Click a start day/)).toBeDefined();

  fireEvent.click(screen.getByRole('button', { name: 'Day 2' }));
  expect(onChange).toHaveBeenCalledWith(2, undefined);

  fireEvent.click(screen.getByRole('button', { name: 'Day 4' }));
  expect(onChange).toHaveBeenCalledWith(2, 4);
});

test('clears a single-day selection when the same day is clicked again', () => {
  const onChange = vi.fn();
  render(<DayRangePicker endDay={2} maximumDay={4} onChange={onChange} startDay={2} />);

  fireEvent.click(screen.getByRole('button', { name: 'Day 2, Start and End' }));
  expect(onChange).toHaveBeenCalledWith(undefined, undefined);
});

test('releasing a press outside the grid does not paint a later day', () => {
  const onChange = vi.fn();
  render(
    <DayRangePicker endDay={undefined} maximumDay={4} onChange={onChange} startDay={undefined} />
  );
  const grid = screen.getByTestId('day-range-days');
  const first = screen.getByRole('button', { name: 'Day 1' });
  const other = screen.getByRole('button', { name: 'Day 3' });
  const original = document.elementFromPoint;
  try {
    document.elementFromPoint = () => first;
    fireEvent.pointerDown(grid, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window);
    document.elementFromPoint = () => other;
    fireEvent.pointerMove(grid, { clientX: 30, clientY: 10 });
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    document.elementFromPoint = original;
  }
});

test('marks other stops as taken and keeps them unselectable', () => {
  render(
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

  const taken = screen.getByRole('button', { name: 'Day 4, Taken' });
  expect(taken.hasAttribute('data-taken')).toBe(true);
  expect(taken.hasAttribute('disabled')).toBe(true);
});
