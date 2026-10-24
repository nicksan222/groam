import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FormAttachments } from './form-attachments';

const files = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `m${index}`, name: `file-${index}.pdf` }));

async function renderAttachments(count = 1) {
  const props = { onRemove: vi.fn(), onUpload: vi.fn() };
  await render(
    <FormAttachments
      attachments={files(count)}
      inputLabel="Upload booking files"
      legend="Booking files"
      max={5}
      {...props}
    />
  );
  return props;
}

test('counts files, lists them, and removes one by id', async () => {
  const props = await renderAttachments();
  await expect.element(page.getByRole('group', { name: 'Booking files' })).toBeInTheDocument();
  await expect.element(page.getByText('1 of 5 files')).toBeInTheDocument();
  await expect.element(page.getByText('PDFs, images, or video.')).toBeInTheDocument();
  await page.getByRole('button', { name: 'Remove file-0.pdf' }).click();
  expect(props.onRemove).toHaveBeenCalledWith('m0');
});

test('stops adding at the limit', async () => {
  await renderAttachments(5);
  await expect.element(page.getByRole('button', { name: 'Add files' })).toBeDisabled();
  await expect.element(page.getByLabelText('Upload booking files')).toBeDisabled();
});

test('forwards chosen files', async () => {
  const props = await renderAttachments();
  await page
    .getByLabelText('Upload booking files')
    .upload(new File(['x'], 'ticket.pdf', { type: 'application/pdf' }));
  await expect.poll(() => props.onUpload.mock.calls.length).toBe(1);
});
