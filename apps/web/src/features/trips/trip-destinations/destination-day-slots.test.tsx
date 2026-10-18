import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DestinationDaySlots } from './destination-day-slots';

function renderSlots(props: Partial<Parameters<typeof DestinationDaySlots>[0]> = {}) {
  const onChange = vi.fn();
  const result = render(
    <DestinationDaySlots
      destinationName="Lisbon"
      disabled={false}
      endDay={undefined}
      maximumDay={5}
      minimumDay={1}
      onChange={onChange}
      startDate={null}
      startDay={undefined}
      totalDays={5}
      {...props}
    />
  );
  return { onChange, result };
}

describe('DestinationDaySlots', () => {
  test('labels the picker with the destination and prompts for a start day', async () => {
    await renderSlots().result;
    await expect.element(page.getByRole('group', { name: 'Lisbon day range' })).toBeVisible();
    await expect.element(page.getByText(/Click a start day/u)).toBeVisible();
  });

  test('reports the chosen start day first', async () => {
    const { onChange, result } = renderSlots();
    await result;
    await page.getByRole('button', { name: 'Day 2' }).click();
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0]![0]).toBe(2);
  });

  test('shows the selected range with arrive and leave labels', async () => {
    await renderSlots({ endDay: 4, startDay: 2 }).result;
    await expect.element(page.getByRole('button', { name: /Day 2.*Arrive/u })).toBeVisible();
    await expect.element(page.getByRole('button', { name: /Day 4.*Leave/u })).toBeVisible();
  });

  test('marks days taken by sibling stops', async () => {
    await renderSlots({ takenDays: new Set([1]) }).result;
    await expect.element(page.getByRole('button', { name: /Day 1.*Taken/u })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /Day 3.*Taken/u }))
      .not.toBeInTheDocument();
  });

  test('does not report changes while disabled', async () => {
    const { onChange, result } = renderSlots({ disabled: true });
    await result;
    await expect.element(page.getByRole('button', { name: 'Day 2' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
