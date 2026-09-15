import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DayTimeRangePicker } from './day-time-range-picker';

test('combines a bounded day range with precise local times', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
  );
  const onChange = vi.fn();
  render(
    <DayTimeRangePicker
      bounds={{ maximumDay: 4, startDate: '2027-06-01', totalDays: 4 }}
      label="Train schedule"
      labels={{ end: 'Arrival', start: 'Departure' }}
      onChange={onChange}
      value={{ endDay: 2, endTime: '09:10', startDay: 1, startTime: '08:35' }}
    />
  );

  expect(screen.getByRole('button', { name: /Day 1, Jun 1/ })).toBeDefined();
  expect(screen.getByRole('button', { name: /Day 2, Jun 2/ })).toBeDefined();
  fireEvent.change(screen.getByLabelText('Arrival time (optional)'), {
    target: { value: '09:30' }
  });
  expect(onChange).toHaveBeenCalledWith({
    endDay: 2,
    endTime: '09:30',
    startDay: 1,
    startTime: '08:35'
  });
});
