import { expect, test } from 'vitest';
import type { Id } from '#convex-generated/dataModel';
import { pngBlob } from '#testing/media';
import { Files } from './index';

const storageId = 'kg_test_storage' as Id<'_storage'>;

test('normalizes declared content types', () => {
  expect(Files.normalizeContentType(' IMAGE/PNG; charset=binary ')).toBe('image/png');
});

test('recognizes supported file signatures', () => {
  expect(
    Files.hasValidSignature(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'image/png'
    )
  ).toBe(true);
  expect(
    Files.hasValidSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf')
  ).toBe(true);
  expect(Files.hasValidSignature(new TextEncoder().encode('ID3'), 'audio/mpeg')).toBe(true);
  expect(Files.hasValidSignature(new Uint8Array([0xff, 0xe0]), 'audio/mpeg')).toBe(true);
  expect(Files.hasValidSignature(new TextEncoder().encode('OggS'), 'audio/ogg')).toBe(true);
  expect(Files.hasValidSignature(new TextEncoder().encode('RIFF0000WAVE'), 'audio/wav')).toBe(true);
  expect(Files.hasValidSignature(new TextEncoder().encode('0000ftypavif'), 'image/avif')).toBe(
    true
  );
  expect(Files.hasValidSignature(new TextEncoder().encode('GIF87a'), 'image/gif')).toBe(true);
  expect(Files.hasValidSignature(new TextEncoder().encode('GIF89a'), 'image/gif')).toBe(true);
  expect(Files.hasValidSignature(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true);
  expect(
    Files.hasValidSignature(
      new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70]),
      'video/mp4'
    )
  ).toBe(true);
  expect(Files.hasValidSignature(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), 'video/webm')).toBe(
    true
  );
  expect(Files.hasValidSignature(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), 'audio/webm')).toBe(
    true
  );
  expect(
    Files.hasValidSignature(
      new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70]),
      'audio/mp4'
    )
  ).toBe(true);
  expect(
    Files.hasValidSignature(
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      'image/webp'
    )
  ).toBe(true);
});

test.each(['image/avif', 'image/gif', 'audio/mpeg', 'image/png'])(
  'rejects invalid %s file signatures',
  (contentType) => {
    expect(Files.hasValidSignature(new Uint8Array([1, 2, 3]), contentType)).toBe(false);
  }
);

test('rejects unknown content types', () => {
  expect(Files.hasValidSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'image/svg+xml')).toBe(
    false
  );
});

test('reads only the requested signature bytes', async () => {
  await expect(Files.readSignature(new Blob(['signature']), 4)).resolves.toEqual(
    new TextEncoder().encode('sign')
  );
  await expect(Files.readSignature(null)).resolves.toEqual(new Uint8Array());
});

test('registers every supported upload content type', () => {
  expect([...Files.supportedContentTypes].sort()).toEqual(
    [
      'application/pdf',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
      'audio/webm',
      'image/avif',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ].sort()
  );
  expect(Files.isImage('image/png')).toBe(true);
  expect(Files.isImage('application/pdf')).toBe(false);
  expect(Files.isImage('image/svg+xml')).toBe(false);
});

test('rejects oversized, unsupported, and unsigned files', () => {
  expect(Files.validationError(25 * 1024 * 1024 + 1, 'image/png', true)).toBe(
    'Files must be 25 MB or smaller'
  );
  expect(Files.validationError(12, 'text/plain', true)).toBe(
    'Upload a supported image, video, audio file, or PDF'
  );
  expect(Files.validationError(12, 'image/png', false)).toBe(
    'The file contents do not match its media type'
  );
});

test('accepts supported files that match their media type', () => {
  expect(Files.validationError(12, 'image/png', true)).toBeNull();
  expect(Files.validationError(25 * 1024 * 1024, 'application/pdf', true)).toBeNull();
});

test('reads content type and signature from stored blobs', async () => {
  await expect(
    Files.inspect({ storage: { get: async () => pngBlob() } }, storageId)
  ).resolves.toEqual({ contentType: 'image/png', signatureValid: true });
});

test('falls back to the declared type when storage is empty', async () => {
  await expect(
    Files.inspect({ storage: { get: async () => null } }, storageId, 'image/png')
  ).resolves.toEqual({ contentType: 'image/png', signatureValid: false });
});

test('rejects blobs whose bytes do not match the declared type', async () => {
  await expect(
    Files.inspect(
      { storage: { get: async () => new Blob(['not-a-png'], { type: 'image/png' }) } },
      storageId
    )
  ).resolves.toEqual({ contentType: 'image/png', signatureValid: false });
});
