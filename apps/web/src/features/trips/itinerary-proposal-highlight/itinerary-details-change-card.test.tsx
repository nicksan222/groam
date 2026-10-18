import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { testIds } from '@/lib/test-ids';
import { ItineraryDetailsChangeCard } from './itinerary-details-change-card';

function makeChange(fields: unknown[]): ItineraryChange {
  return {
    change: 'modified',
    entity: 'details',
    fields,
    key: 'details',
    label: 'Trip details'
  } as ItineraryChange;
}

const nameField = {
  after: 'Portugal 2027',
  before: 'Portugal',
  display: 'value',
  format: 'text',
  key: 'name',
  label: 'Name'
};
const unchangedField = {
  ...nameField,
  after: 'Same',
  before: 'Same',
  key: 'currency',
  label: 'Currency'
};
const mediaField = {
  after: null,
  before: null,
  display: 'media',
  format: 'text',
  key: 'cover',
  label: 'Cover'
};

describe('changed fields', () => {
  test('lists changed values and hides unchanged ones', async () => {
    await render(<ItineraryDetailsChangeCard change={makeChange([nameField, unchangedField])} />);
    const list = page.getByRole('list', { name: 'What changed' });
    await expect.element(list.getByText('Name')).toBeVisible();
    await expect.element(list.getByText('Portugal 2027')).toBeVisible();
    await expect.element(list.getByText('Currency')).not.toBeInTheDocument();
  });

  test('summarises media changes', async () => {
    await render(<ItineraryDetailsChangeCard change={makeChange([mediaField])} />);
    await expect.element(page.getByText('Attachments updated')).toBeVisible();
  });

  test('omits the list when nothing visible changed', async () => {
    await render(<ItineraryDetailsChangeCard change={makeChange([unchangedField])} />);
    await expect.element(page.getByRole('list', { name: 'What changed' })).not.toBeInTheDocument();
    await expect.element(page.getByText('Conflict')).toBeVisible();
  });
});

describe('resolve action', () => {
  test.each([
    ['canResolve is false', { canResolve: false, onResolve: vi.fn() }],
    ['onResolve is missing', { canResolve: true }]
  ])('is hidden when %s', async (_, props) => {
    await render(<ItineraryDetailsChangeCard change={makeChange([nameField])} {...props} />);
    await expect
      .element(page.getByRole('button', { name: 'Choose what to keep' }))
      .not.toBeInTheDocument();
  });

  test('calls onResolve when clicked', async () => {
    const onResolve = vi.fn();
    await render(
      <ItineraryDetailsChangeCard
        canResolve
        change={makeChange([nameField])}
        onResolve={onResolve}
      />
    );
    await page.getByRole('button', { name: 'Choose what to keep' }).click();
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  test('is disabled while pending', async () => {
    await render(
      <ItineraryDetailsChangeCard
        canResolve
        change={makeChange([nameField])}
        onResolve={vi.fn()}
        pending
      />
    );
    await expect.element(page.getByTestId(testIds.itineraryDetailsResolve)).toBeDisabled();
  });
});
