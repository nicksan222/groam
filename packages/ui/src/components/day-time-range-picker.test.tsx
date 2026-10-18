import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DayTimeRangePicker } from './day-time-range-picker';

test('combines a bounded day range with precise local times', async () => {
  const onChange = vi.fn();
  await render(
    <DayTimeRangePicker
      bounds={{ maximumDay: 4, startDate: '2027-06-01', totalDays: 4 }}
      label="Train schedule"
      labels={{ end: 'Arrival', start: 'Departure' }}
      onChange={onChange}
      value={{ endDay: 2, endTime: '09:10', startDay: 1, startTime: '08:35' }}
    />
  );

  await expect.element(page.getByRole('button', { name: /Day 1, Jun 1/ })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: /Day 2, Jun 2/ })).toBeInTheDocument();
  await page.getByLabelText('Arrival time (optional)').fill('09:30');
  expect(onChange).toHaveBeenCalledWith({
    endDay: 2,
    endTime: '09:30',
    startDay: 1,
    startTime: '08:35'
  });
});

test('extends a saved single day into a range', async () => {
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
  await render(<RangeEditor />);
  await page.getByRole('button', { name: 'Day 4, Start and End' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Day 4, Start' }))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Day 6' }).click();
  await expect.element(page.getByText(/3 days · Start Day 4 · End Day 6/u)).toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Day 6, End' }))
    .toHaveAttribute('aria-pressed', 'true');
});

test('commits a new single day immediately so saving during a selection cannot persist old days', async () => {
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
  await render(<RangeEditor />);
  await page.getByRole('button', { name: 'Day 5' }).click();
  expect(changes).toHaveBeenLastCalledWith({
    endDay: 5,
    endTime: '',
    startDay: 5,
    startTime: ''
  });
  await expect
    .element(page.getByText('Start Day 5 — pick end day or keep one day.'))
    .toBeInTheDocument();
  await page.getByRole('button', { name: 'Day 5, Start' }).click();
  expect(changes).toHaveBeenCalledTimes(1);
  await expect
    .element(page.getByRole('button', { name: 'Day 5, Start and End' }))
    .toBeInTheDocument();
});
