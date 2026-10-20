import { describe, expect, test } from 'vite-plus/test';
import { mediaValidationError } from './media-validation';

describe('mediaValidationError', () => {
  test.each(['image/png', 'video/mp4', 'application/pdf'])(
    'accepts %s uploads within the size limit',
    (type) => {
      expect(mediaValidationError({ size: 1024, type })).toBeNull();
    }
  );

  test('rejects files larger than 25 MB before checking their content type', () => {
    expect(mediaValidationError({ size: 25 * 1024 * 1024 + 1, type: 'text/plain' })).toBe(
      'Files must be 25 MB or smaller'
    );
  });

  test.each([
    'audio/mpeg',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'text/plain',
    'application/zip',
    'image/svg+xml',
    ''
  ])('rejects unsupported type %j', (type) => {
    expect(mediaValidationError({ size: 1024, type })).toBe('Upload an image, video, or PDF');
  });
});
