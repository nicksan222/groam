import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { useProfileSettings } from './use-profile-settings';

const auth = vi.hoisted(() => ({ updateUser: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: { updateUser: auth.updateUser }
}));

const user = {
  email: 'traveler@example.com',
  image: null,
  name: 'Original name',
  username: 'traveler'
} as Session['user'];

beforeEach(() => {
  vi.clearAllMocks();
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
});

describe('useProfileSettings', () => {
  test('trims and persists the profile name and image', async () => {
    const { result } = renderHook(() => useProfileSettings(user));
    act(() =>
      result.current.updateState({
        image: '  https://example.com/photo.jpg  ',
        name: '  Updated name  ',
        username: 'updated_traveler'
      })
    );

    await act(() => result.current.save());

    expect(auth.updateUser).toHaveBeenCalledWith({
      image: 'https://example.com/photo.jpg',
      name: 'Updated name',
      username: 'updated_traveler'
    });
    expect(result.current.state).toMatchObject({
      error: null,
      isPending: false,
      message: 'Profile saved.'
    });
  });

  test('stores a blank image as null and surfaces auth errors', async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { message: 'Profile update failed' } });
    const { result } = renderHook(() => useProfileSettings(user));

    await act(() => result.current.save());

    expect(auth.updateUser).toHaveBeenCalledWith({
      image: null,
      name: 'Original name',
      username: 'traveler'
    });
    expect(result.current.state).toMatchObject({
      error: 'Profile update failed',
      isPending: false,
      message: null
    });
  });
});
