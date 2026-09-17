import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useOrganizationLogo } from './use-organization-logo';

const auth = vi.hoisted(() => ({ update: vi.fn() }));
const convex = vi.hoisted(() => ({ mutations: [] as Array<ReturnType<typeof vi.fn>> }));
const media = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock('@groam/auth/client', () => ({ authClient: { organization: { update: auth.update } } }));
vi.mock('convex/react', () => ({ useMutation: () => convex.mutations.shift() }));
vi.mock('@/features/media/hooks/use-media-upload', () => ({ useMediaUpload: () => media.upload }));

beforeEach(() => {
  vi.clearAllMocks();
  convex.mutations = [vi.fn(), vi.fn()];
  media.upload.mockResolvedValue('media-1');
  auth.update.mockResolvedValue({ data: {}, error: null });
});

describe('useOrganizationLogo', () => {
  test('rejects non-image files before uploading', async () => {
    const { result } = renderHook(() => useOrganizationLogo('organization-1'));

    await expect(
      act(() => result.current.upload(new File(['x'], 'notes.txt', { type: 'text/plain' })))
    ).rejects.toThrow('Choose an image');
    expect(media.upload).not.toHaveBeenCalled();
  });

  test('uploads media, stores the logo, and refreshes the active organization', async () => {
    const [setLogo] = convex.mutations;
    setLogo?.mockResolvedValue({ url: 'https://cdn.example/logo.png' });
    const { result } = renderHook(() => useOrganizationLogo('organization-1'));
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await expect(act(() => result.current.upload(file))).resolves.toBe(
      'https://cdn.example/logo.png'
    );
    expect(media.upload).toHaveBeenCalledWith(file, null);
    expect(setLogo).toHaveBeenCalledWith({ mediaId: 'media-1' });
    expect(auth.update).toHaveBeenCalledWith({
      data: { logo: 'https://cdn.example/logo.png' },
      organizationId: 'organization-1'
    });
  });

  test('does not set a logo when media upload returns no id and clears via both stores', async () => {
    media.upload.mockResolvedValueOnce(null);
    const [, clearLogo] = convex.mutations;
    const { result } = renderHook(() => useOrganizationLogo('organization-1'));

    await expect(
      act(() => result.current.upload(new File(['logo'], 'logo.png', { type: 'image/png' })))
    ).rejects.toThrow('Unable to upload group logo');
    await act(() => result.current.clear());
    expect(clearLogo).toHaveBeenCalledWith({});
    expect(auth.update).toHaveBeenCalledWith({
      data: { logo: null },
      organizationId: 'organization-1'
    });
  });
});
