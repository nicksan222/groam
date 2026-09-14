import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UploadCloud } from 'lucide-react';
import { afterEach, expect, test, vi } from 'vitest';
import { FileDropzone } from './file-dropzone';

afterEach(cleanup);

test('renders the title, description, and icon', () => {
  render(
    <FileDropzone
      description="Images, video, audio, or PDF up to 25 MB"
      icon={<UploadCloud data-icon="upload" />}
      onChoose={() => undefined}
      title="Choose media to upload"
    />
  );

  expect(screen.getByRole('button', { name: /Choose media to upload/ })).toBeTruthy();
  expect(screen.getByText('Images, video, audio, or PDF up to 25 MB')).toBeTruthy();
});

test('calls onChoose and honors disabled', () => {
  const onChoose = vi.fn();
  const { rerender } = render(<FileDropzone onChoose={onChoose} title="Choose media to upload" />);

  fireEvent.click(screen.getByRole('button', { name: 'Choose media to upload' }));
  expect(onChoose).toHaveBeenCalledTimes(1);

  rerender(<FileDropzone disabled onChoose={onChoose} title="Choose media to upload" />);
  expect(
    (screen.getByRole('button', { name: 'Choose media to upload' }) as HTMLButtonElement).disabled
  ).toBe(true);
});
