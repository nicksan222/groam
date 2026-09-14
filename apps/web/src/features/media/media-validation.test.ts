import { describe, expect, test } from 'vitest';
import { mediaValidationError } from './media-validation';

describe('mediaValidationError', () => {
  test.each(['image/png', 'video/mp4', 'audio/mpeg', 'application/pdf'])(
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

  test.each(['text/plain', 'application/zip', 'image/svg+xml', ''])(
    'rejects unsupported type %j',
    (type) => {
      expect(mediaValidationError({ size: 1024, type })).toBe(
        'Upload an image, video, audio file, or PDF'
      );
    }
  );
});
