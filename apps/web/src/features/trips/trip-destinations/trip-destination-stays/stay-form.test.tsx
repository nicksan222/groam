import { render } from '@groam/vitest-config/react';
import { createRef, type FormEvent } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { StayDraft } from '@/features/trips/hooks/trip-destination-form-state';
import { StayForm } from './stay-form';
import type { TripStayDestination } from './stay-types';

function makeDestination(overrides: Partial<TripStayDestination> = {}): TripStayDestination {
  return {
    endDay: 4,
    id: 'lisbon',
    name: 'Lisbon',
    startDay: 2,
    ...overrides
  } as unknown as TripStayDestination;
}

function makeDraft(overrides: Partial<StayDraft> = {}): StayDraft {
  return {
    address: '',
    attachments: [],
    checkInDay: '2',
    checkInTime: '',
    checkOutDay: '3',
    checkOutTime: '',
    cost: '',
    costSplit: 'total',
    notes: '',
    title: 'Hotel Alfama',
    ...overrides
  };
}

function renderForm(
  props: Partial<
    Omit<Parameters<typeof StayForm>[0], 'onCancel' | 'onChange' | 'onSubmit' | 'onUpload'>
  > = {}
) {
  const handlers = {
    onCancel: vi.fn(),
    onChange: vi.fn(),
    onSubmit: vi.fn((event: FormEvent) => event.preventDefault()),
    onUpload: vi.fn()
  };
  return {
    ...handlers,
    ready: render(
      <StayForm
        currency="EUR"
        destination={makeDestination()}
        draft={makeDraft()}
        fileInputRef={createRef<HTMLInputElement>()}
        isPending={false}
        isUploading={false}
        tripStartDate={null}
        {...handlers}
        {...props}
      />
    )
  };
}

const saveButton = () => page.getByRole('button', { name: /^Save$/u });

describe('StayForm', () => {
  test('names the destination and shows the draft', async () => {
    await renderForm({ draft: makeDraft({ address: 'Rua 1', notes: 'Late arrival' }) }).ready;
    await expect.element(page.getByText('Your place in Lisbon')).toBeVisible();
    await expect.element(page.getByPlaceholder('e.g. Hotel Lisboa')).toHaveValue('Hotel Alfama');
    await expect.element(page.getByPlaceholder('e.g. Rua Augusta 10, Lisbon')).toHaveValue('Rua 1');
    await expect
      .element(page.getByRole('textbox', { name: 'Notes' }))
      .toHaveTextContent('Late arrival');
  });

  test.each([
    ['name', 'e.g. Hotel Lisboa', 'Pension', { title: 'Pension' }],
    ['address', 'e.g. Rua Augusta 10, Lisbon', 'Rua 2', { address: 'Rua 2' }]
  ])('reports edits to the %s', async (_, placeholder, text, patch) => {
    const { onChange, ready } = renderForm();
    await ready;
    await page.getByPlaceholder(placeholder).fill(text);
    expect(onChange).toHaveBeenLastCalledWith(patch);
  });

  test('reports edits to the notes', async () => {
    const { onChange, ready } = renderForm();
    await ready;
    await page.getByRole('textbox', { name: 'Notes' }).fill('Code 42');
    expect(onChange).toHaveBeenLastCalledWith({ notes: 'Code 42' });
  });

  test('reports a typed cost', async () => {
    const { onChange, ready } = renderForm();
    await ready;
    await page.getByLabelText(/Estimated cost for the group \(EUR\)/u).fill('90');
    expect(onChange).toHaveBeenLastCalledWith({ cost: '90' });
  });

  test('shows a cost error and blocks saving', async () => {
    await renderForm({ draft: makeDraft({ cost: '-5' }) }).ready;
    await expect.element(page.getByText('Cost must be zero or more.')).toBeVisible();
    await expect.element(saveButton()).toBeDisabled();
  });

  test.each([
    ['a name', makeDraft(), false],
    ['no name', makeDraft({ title: '  ' }), true],
    ['check-out before check-in', makeDraft({ checkInDay: '3', checkOutDay: '2' }), true]
  ])('save is %s', async (_, draft, disabled) => {
    await renderForm({ draft }).ready;
    if (disabled) await expect.element(saveButton()).toBeDisabled();
    else await expect.element(saveButton()).toBeEnabled();
  });

  test('saves and cancels', async () => {
    const { onCancel, onSubmit, ready } = renderForm();
    await ready;
    await saveButton().click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Close stay editor' }).click();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  test('disables everything while saving', async () => {
    await renderForm({ isPending: true }).ready;
    await expect.element(saveButton()).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Close stay editor' })).toBeDisabled();
    await expect.element(page.getByPlaceholder('e.g. Hotel Lisboa')).toBeDisabled();
  });

  test('counts booking files and removes one', async () => {
    const { onChange, ready } = renderForm({
      draft: makeDraft({
        attachments: [
          { id: 'f1', name: 'booking.pdf' },
          { id: 'f2', name: 'map.png' }
        ] as StayDraft['attachments']
      })
    });
    await ready;
    await expect.element(page.getByText('2 of 5 files')).toBeVisible();
    await page.getByRole('button', { name: 'Remove booking.pdf' }).click();
    expect(onChange).toHaveBeenCalledWith({
      attachments: [{ id: 'f2', name: 'map.png' }]
    });
  });

  test('blocks adding files at the limit', async () => {
    await renderForm({
      draft: makeDraft({
        attachments: Array.from({ length: 5 }, (_, index) => ({
          id: `f${index}`,
          name: `file-${index}.pdf`
        })) as StayDraft['attachments']
      })
    }).ready;
    await expect.element(page.getByText('5 of 5 files')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Add files' })).toBeDisabled();
    await expect.element(page.getByLabelText('Upload stay booking files')).toBeDisabled();
  });

  test('disables file adding while uploading', async () => {
    await renderForm({ isUploading: true }).ready;
    await expect.element(page.getByRole('button', { name: /Add files/u })).toBeDisabled();
  });

  test('forwards chosen files to the upload handler', async () => {
    const { onUpload, ready } = renderForm();
    await ready;
    await page
      .getByLabelText('Upload stay booking files')
      .upload(new File(['x'], 'booking.pdf', { type: 'application/pdf' }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  test('uses the day picker to change check-in and check-out', async () => {
    const { onChange, ready } = renderForm();
    await ready;
    await expect.element(page.getByRole('group', { name: 'Stay schedule' })).toBeVisible();
    await page.getByRole('button', { name: /Day 2.*Check in/u }).click();
    expect(onChange).toHaveBeenCalled();
  });
});
