import { render } from '@groam/vitest-config/react';
import { UploadCloud } from 'lucide-react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FileDropzone } from './file-dropzone';

test('renders the title, description, and icon', async () => {
  await render(
    <FileDropzone
      description="Images, video, audio, or PDF up to 25 MB"
      icon={<UploadCloud data-icon="upload" />}
      onChoose={() => undefined}
      title="Choose media to upload"
    />
  );

  await expect
    .element(page.getByRole('button', { name: /Choose media to upload/ }))
    .toBeInTheDocument();
  await expect
    .element(page.getByText('Images, video, audio, or PDF up to 25 MB'))
    .toBeInTheDocument();
});

test('calls onChoose and honors disabled', async () => {
  const onChoose = vi.fn();
  const { rerender } = await render(
    <FileDropzone onChoose={onChoose} title="Choose media to upload" />
  );

  await page.getByRole('button', { name: 'Choose media to upload' }).click();
  expect(onChoose).toHaveBeenCalledTimes(1);

  await rerender(<FileDropzone disabled onChoose={onChoose} title="Choose media to upload" />);
  await expect.element(page.getByRole('button', { name: 'Choose media to upload' })).toBeDisabled();
});
