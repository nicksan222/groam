import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CreateTripIdeaDialog } from '@/features/trips/trip-ideas/create-trip-idea-dialog';

test('explains that starting an idea creates private work from the shared trip', async () => {
  await render(
    <CreateTripIdeaDialog
      isCreating={false}
      onCreate={vi.fn()}
      onOpenChange={vi.fn()}
      open
      sharedTripName="Atlantic week"
    />
  );

  await expect.element(page.getByRole('heading', { name: 'New idea' })).toBeInTheDocument();
  await expect.element(page.getByText(/idea from the shared trip/u)).toBeInTheDocument();
  await expect.element(page.getByText(/reviewed and applied/u)).toBeInTheDocument();
  await expect.element(page.getByText('Atlantic week')).toBeInTheDocument();
  await expect.element(page.getByText('Everyone sees this')).toBeInTheDocument();
  await expect.element(page.getByText('Edit here')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Create idea' })).toBeInTheDocument();
});

test('submits an optional custom idea name', async () => {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  await render(
    <CreateTripIdeaDialog isCreating={false} onCreate={onCreate} onOpenChange={vi.fn()} open />
  );

  await page.getByLabelText('What do you want to change?').fill('  Coastal route  ');
  await page.getByRole('button', { name: 'Create idea' }).click();

  await vi.waitFor(() => expect(onCreate).toHaveBeenCalledWith('Coastal route'));
});

test('requests an automatically generated name when left blank', async () => {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  await render(
    <CreateTripIdeaDialog isCreating={false} onCreate={onCreate} onOpenChange={vi.fn()} open />
  );

  await page.getByRole('button', { name: 'Create idea' }).click();

  await vi.waitFor(() => expect(onCreate).toHaveBeenCalledWith(undefined));
});

test('keeps the dialog open while an idea is being created', async () => {
  const onOpenChange = vi.fn();
  await render(
    <CreateTripIdeaDialog isCreating onCreate={vi.fn()} onOpenChange={onOpenChange} open />
  );

  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  // Forced: a disabled control must ignore clicks, which is the behavior under test.
  await page.getByRole('button', { name: 'Cancel' }).click({ force: true });

  expect(onOpenChange).not.toHaveBeenCalled();
});

test('does not mistake trips still loading for an empty group', async () => {
  await render(
    <CreateTripIdeaDialog
      isCreating={false}
      onCreate={vi.fn()}
      onOpenChange={vi.fn()}
      onSelectedTripIdChange={vi.fn()}
      open
      trips={[]}
      tripsLoading
    />
  );
  await expect.element(page.getByText('Loading trips…')).toBeInTheDocument();
  await expect.element(page.getByText('Start with a trip')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Create idea' })).toBeDisabled();
});
