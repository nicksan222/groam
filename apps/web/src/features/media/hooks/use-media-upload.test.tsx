import { env } from '@groam/env/web-client';
import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useMediaUpload } from './use-media-upload';

const convex = vi.hoisted(() => ({
  generateUploadUrl: vi.fn(),
  save: vi.fn(),
  useAction: vi.fn(),
  useMutation: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useAction: (...args: unknown[]) => convex.useAction(...args),
  useMutation: (...args: unknown[]) => convex.useMutation(...args)
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));
vi.mock('@groam/env/web-client', () => ({
  env: { convexUrl: 'http://127.0.0.1:3210' }
}));

const pngFile = new File(['image'], 'cover.png', { type: 'image/png' });
const uploadUrl = () => new URL('/api/storage/upload?token=signed', env.convexUrl).toString();

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(convex.generateUploadUrl);
  convex.useAction.mockReturnValue(convex.save);
  convex.generateUploadUrl.mockResolvedValue(uploadUrl());
  convex.save.mockResolvedValue({ mediaId: 'media-a', ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubUploadResponse(body: unknown, status = 200) {
  const response = new Response(JSON.stringify(body), { status });
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));
  return response;
}

describe('useMediaUpload', () => {
  test('rejects unsupported files before requesting an upload URL', async () => {
    const { result } = await renderHook(() => useMediaUpload());
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });

    await expect(act(() => result.current(file))).resolves.toBeNull();

    expect(notifications.error).toHaveBeenCalledWith('Upload an image, video, or PDF');
    expect(convex.generateUploadUrl).not.toHaveBeenCalled();
  });

  test('reports oversized files through the error callback', async () => {
    const onError = vi.fn();
    const { result } = await renderHook(() => useMediaUpload());
    const file = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'huge.png', {
      type: 'image/png'
    });

    await expect(
      act(() => result.current(file, `${file.name} uploaded`, onError))
    ).resolves.toBeNull();

    expect(onError).toHaveBeenCalledWith('Files must be 25 MB or smaller');
    expect(notifications.error).toHaveBeenCalledWith('Files must be 25 MB or smaller');
    expect(convex.generateUploadUrl).not.toHaveBeenCalled();
  });

  test('uploads to Convex storage and saves the resulting media id', async () => {
    stubUploadResponse({ storageId: 'storage-a' });
    const { result } = await renderHook(() => useMediaUpload());

    await expect(act(() => result.current(pngFile))).resolves.toBe('media-a');

    expect(convex.generateUploadUrl).toHaveBeenCalledWith({});
    expect(convex.save).toHaveBeenCalledWith({
      contentType: 'image/png',
      name: 'cover.png',
      storageId: 'storage-a'
    });
    expect(notifications.success).toHaveBeenCalledWith('cover.png uploaded');
  });

  test('can skip the success toast when a caller supplies a null message', async () => {
    stubUploadResponse({ storageId: 'storage-a' });
    const { result } = await renderHook(() => useMediaUpload());

    await expect(act(() => result.current(pngFile, null))).resolves.toBe('media-a');
    expect(notifications.success).not.toHaveBeenCalled();
  });

  test('surfaces malformed Convex upload responses', async () => {
    stubUploadResponse({});
    const { result } = await renderHook(() => useMediaUpload());

    await expect(act(() => result.current(pngFile))).resolves.toBeNull();

    expect(notifications.error).toHaveBeenCalledWith('Convex returned an invalid upload response');
    expect(convex.save).not.toHaveBeenCalled();
  });

  test('surfaces HTTP upload failures', async () => {
    stubUploadResponse({ storageId: 'storage-a' }, 500);
    const onError = vi.fn();
    const { result } = await renderHook(() => useMediaUpload());

    await expect(
      act(() => result.current(pngFile, `${pngFile.name} uploaded`, onError))
    ).resolves.toBeNull();

    expect(onError).toHaveBeenCalledWith('Upload failed with status 500');
    expect(notifications.error).toHaveBeenCalledWith('Upload failed with status 500');
    expect(convex.save).not.toHaveBeenCalled();
  });

  test('surfaces Convex save errors without claiming success', async () => {
    stubUploadResponse({ storageId: 'storage-a' });
    convex.save.mockResolvedValue({ error: 'The uploaded file was not found', ok: false });
    const { result } = await renderHook(() => useMediaUpload());

    await expect(act(() => result.current(pngFile))).resolves.toBeNull();

    expect(notifications.error).toHaveBeenCalledWith('The uploaded file was not found');
    expect(notifications.success).not.toHaveBeenCalled();
  });

  test('surfaces thrown upload URL failures', async () => {
    convex.generateUploadUrl.mockRejectedValue(new Error('Not signed in'));
    const { result } = await renderHook(() => useMediaUpload());

    await expect(act(() => result.current(pngFile))).resolves.toBeNull();

    expect(notifications.error).toHaveBeenCalledWith('Not signed in');
    expect(convex.save).not.toHaveBeenCalled();
  });
});
