import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { DayTimeRangePicker } from './day-time-range-picker';

afterEach(cleanup);

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

test('extends a saved single day into a range', () => {
  function RangeEditor() {
    const [value, setValue] = useState({ endDay: 4, endTime: '', startDay: 4, startTime: '' });
    return (
      <DayTimeRangePicker
        bounds={{ maximumDay: 6, minimumDay: 4 }}
        label="Activity schedule"
        onChange={setValue}
        value={value}
      />
    );
  }
  render(<RangeEditor />);
  fireEvent.click(screen.getByRole('button', { name: 'Day 4, Start and End' }));
  expect(screen.getByRole('button', { name: 'Day 4, Start' }).getAttribute('aria-pressed')).toBe(
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Day 6' }));
  expect(screen.getByText(/3 days · Start Day 4 · End Day 6/u)).toBeDefined();
  expect(screen.getByRole('button', { name: 'Day 6, End' }).getAttribute('aria-pressed')).toBe(
    'true'
  );
});

test('commits a new single day immediately so saving during a selection cannot persist old days', () => {
  const changes = vi.fn();
  function RangeEditor() {
    const [value, setValue] = useState({ endDay: 6, endTime: '', startDay: 4, startTime: '' });
    return (
      <DayTimeRangePicker
        bounds={{ maximumDay: 6, minimumDay: 4 }}
        label="Stay schedule"
        onChange={(next) => {
          changes(next);
          setValue(next);
        }}
        value={value}
      />
    );
  }
  render(<RangeEditor />);
  fireEvent.click(screen.getByRole('button', { name: 'Day 5' }));
  expect(changes).toHaveBeenLastCalledWith({
    endDay: 5,
    endTime: '',
    startDay: 5,
    startTime: ''
  });
  expect(screen.getByText('Start Day 5 — pick end day or keep one day.')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Day 5, Start' }));
  expect(changes).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Day 5, Start and End' })).toBeDefined();
});
