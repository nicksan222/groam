import { env } from '@groam/env/web-client';
import { afterEach, expect, test, vi } from 'vitest';
import { storageIdFromUploadResponse, uploadToConvexStorage } from './convex-storage-upload';

vi.mock('@groam/env/web-client', () => ({
  env: { convexUrl: 'http://127.0.0.1:3210' }
}));

afterEach(() => vi.unstubAllGlobals());

test('reads the storage identifier from an upload response', () => {
  expect(storageIdFromUploadResponse({ storageId: 'storage-a' })).toBe('storage-a');
});

test.each([null, 'storage-a', {}, { storageId: 42 }])(
  'rejects malformed upload response %j',
  (response) => {
    expect(() => storageIdFromUploadResponse(response)).toThrow('invalid upload response');
  }
);

test('uploads only to the Convex storage endpoint without following redirects', async () => {
  const response = new Response(JSON.stringify({ storageId: 'storage-a' }), { status: 200 });
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  const file = new File(['image'], 'cover.png', { type: 'image/png' });
  const uploadUrl = new URL('/api/storage/upload?token=signed', env.convexUrl).toString();

  await expect(uploadToConvexStorage(uploadUrl, file, file.type)).resolves.toBe(response);
  expect(fetchMock).toHaveBeenCalledWith(new URL(uploadUrl), {
    body: file,
    headers: { 'Content-Type': 'image/png' },
    method: 'POST',
    redirect: 'error'
  });
});

test.each([
  'https://attacker.example/api/storage/upload?token=signed',
  new URL('/api/other?token=signed', env.convexUrl).toString()
])('rejects an untrusted upload URL %s', async (uploadUrl) => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    uploadToConvexStorage(uploadUrl, new File(['image'], 'cover.png'), 'image/png')
  ).rejects.toThrow('did not match the Convex deployment');
  expect(fetchMock).not.toHaveBeenCalled();
});
