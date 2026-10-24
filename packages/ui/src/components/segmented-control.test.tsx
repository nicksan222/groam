import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { SegmentedControl } from './segmented-control';

const options = [
  { label: 'Days', value: 'days' },
  { label: 'Calendar', value: 'calendar' }
] as const;

test('marks the chosen option and writes each value to the named data attribute', async () => {
  await render(
    <SegmentedControl
      attribute="data-view"
      label="View"
      onChange={() => undefined}
      options={options}
      testId="views"
      value="days"
    />
  );

  const days = page.getByRole('button', { name: 'Days' });
  const calendar = page.getByRole('button', { name: 'Calendar' });
  await expect.element(days).toHaveAttribute('aria-pressed', 'true');
  await expect.element(days).toHaveAttribute('data-view', 'days');
  await expect.element(calendar).toHaveAttribute('aria-pressed', 'false');
  await expect.element(calendar).toHaveAttribute('data-view', 'calendar');
  await expect.element(page.getByRole('group', { name: 'View' })).toBeVisible();
});

test('reports the option that was pressed', async () => {
  const onChange = vi.fn();
  await render(
    <SegmentedControl
      attribute="data-view"
      label="View"
      onChange={onChange}
      options={options}
      value="days"
    />
  );

  await page.getByRole('button', { name: 'Calendar' }).click();
  expect(onChange).toHaveBeenCalledWith('calendar');
});

test('an option can carry more than text, such as a count', async () => {
  await render(
    <SegmentedControl
      attribute="data-lane"
      label="Lane"
      onChange={() => undefined}
      options={[
        {
          label: (
            <>
              Done <span>3</span>
            </>
          ),
          value: 'done'
        }
      ]}
      value="done"
    />
  );
  await expect.element(page.getByRole('button', { name: 'Done 3' })).toBeVisible();
});

const radios = [
  { label: 'Going', value: 'going' },
  { label: 'Maybe', value: 'maybe' },
  { disabled: true, label: 'Hold', value: 'hold' },
  { label: 'Out', value: 'out' }
] as const;

function renderRadios(value: string, onChange: (value: string) => void = () => undefined) {
  return render(
    <SegmentedControl
      attribute="data-rsvp"
      label="RSVP"
      onChange={onChange}
      options={radios}
      radio
      value={value}
    />
  );
}

test('as radios it is a radio group with the chosen option as its tab stop', async () => {
  await renderRadios('going');
  await expect.element(page.getByRole('radiogroup', { name: 'RSVP' })).toBeVisible();
  await expect.element(page.getByRole('radio', { name: 'Going' })).toBeChecked();
  await expect.element(page.getByRole('radio', { name: 'Maybe' })).not.toBeChecked();
  await expect.element(page.getByRole('radio', { name: 'Hold' })).toBeDisabled();
  await expect.element(page.getByRole('radio', { name: 'Going' })).toHaveAttribute('tabindex', '0');
  await expect
    .element(page.getByRole('radio', { name: 'Maybe' }))
    .toHaveAttribute('tabindex', '-1');
});

test('a disabled chosen option leaves the first enabled one as the tab stop', async () => {
  await render(
    <SegmentedControl
      attribute="data-rsvp"
      label="RSVP"
      onChange={() => undefined}
      options={[
        { disabled: true, label: 'Going', value: 'going' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'Out', value: 'out' }
      ]}
      radio
      value="going"
    />
  );
  await expect.element(page.getByRole('radio', { name: 'Going' })).toBeChecked();
  await expect.element(page.getByRole('radio', { name: 'Maybe' })).toHaveAttribute('tabindex', '0');
  await expect.element(page.getByRole('radio', { name: 'Out' })).toHaveAttribute('tabindex', '-1');
});

test('arrows move focus, wrap, and skip disabled options without choosing', async () => {
  const onChange = vi.fn();
  await renderRadios('maybe', onChange);
  (page.getByRole('radio', { name: 'Maybe' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(page.getByRole('radio', { name: 'Out' })).toHaveFocus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(page.getByRole('radio', { name: 'Going' })).toHaveFocus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.element(page.getByRole('radio', { name: 'Out' })).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
});

test('Enter and Space choose the focused option', async () => {
  const onChange = vi.fn();
  await renderRadios('maybe', onChange);
  (page.getByRole('radio', { name: 'Maybe' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  await userEvent.keyboard(' ');
  expect(onChange).toHaveBeenLastCalledWith('out');
  await userEvent.keyboard('{ArrowRight}');
  await userEvent.keyboard('{Enter}');
  expect(onChange).toHaveBeenLastCalledWith('going');
});

test('Home and End jump focus to the first and last enabled options', async () => {
  const onChange = vi.fn();
  await renderRadios('maybe', onChange);
  (page.getByRole('radio', { name: 'Maybe' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{End}');
  await expect.element(page.getByRole('radio', { name: 'Out' })).toHaveFocus();
  await userEvent.keyboard('{Home}');
  await expect.element(page.getByRole('radio', { name: 'Going' })).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
});

test('choosing the option that is already checked reports nothing', async () => {
  const onChange = vi.fn();
  await renderRadios('maybe', onChange);
  await page.getByRole('radio', { name: 'Maybe' }).click();
  (page.getByRole('radio', { name: 'Maybe' }).element() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  expect(onChange).not.toHaveBeenCalled();
});
