import { render } from '@groam/vitest-config/react';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TransferFiles } from './transfer-files';

type Props = Parameters<typeof TransferFiles>[0];

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    attachments: [],
    fileInputRef: createRef<HTMLInputElement>(),
    fromLabel: 'Rome',
    isBusy: false,
    isUploading: false,
    onRemove: vi.fn(),
    onUpload: vi.fn(),
    toLabel: 'Paris',
    ...overrides
  };
}

const files = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `m${index}`, name: `file-${index}.pdf` }));

describe('TransferFiles', () => {
  test('describes the accepted files and enables upload while empty', async () => {
    await render(<TransferFiles {...makeProps()} />);
    await expect.element(page.getByText('PDFs, images, or video.')).toBeVisible();
    await expect.element(page.getByText('0 of 5 files', { exact: false })).not.toBeInTheDocument();
    await expect
      .element(page.getByLabelText('Upload files for travel from Rome to Paris'))
      .toBeEnabled();
  });

  test('lists attachments and removes one by id', async () => {
    const props = makeProps({ attachments: files(2) as Props['attachments'] });
    await render(<TransferFiles {...props} />);
    await expect.element(page.getByText('file-1.pdf')).toBeVisible();
    await page.getByRole('button', { name: 'Remove file-1.pdf' }).click();
    expect(props.onRemove).toHaveBeenCalledWith('m1');
  });

  test.each([
    ['busy', { isBusy: true }, 1],
    ['at the file limit', { attachments: files(5) as Props['attachments'] }, 5]
  ])('disables upload when %s', async (_, overrides, count) => {
    await render(<TransferFiles {...makeProps(overrides)} />);
    await expect.element(page.getByRole('button', { name: 'Add files' })).toBeDisabled();
    await expect
      .element(page.getByLabelText('Upload files for travel from Rome to Paris'))
      .toBeDisabled();
    expect(count).toBeGreaterThan(0);
  });

  test('forwards selected files to onUpload', async () => {
    const props = makeProps();
    await render(<TransferFiles {...props} />);
    await page
      .getByLabelText('Upload files for travel from Rome to Paris')
      .upload(new File(['x'], 'ticket.pdf', { type: 'application/pdf' }));
    await expect.poll(() => (props.onUpload as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
