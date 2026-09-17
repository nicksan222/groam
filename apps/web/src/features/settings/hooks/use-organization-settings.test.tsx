import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { useOrganizationSettings } from './use-organization-settings';

const auth = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
  setActive: vi.fn(),
  update: vi.fn()
}));
const logo = vi.hoisted(() => ({ clear: vi.fn(), upload: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    organization: {
      delete: auth.remove,
      list: auth.list,
      setActive: auth.setActive,
      update: auth.update
    }
  }
}));

vi.mock('./use-organization-logo', () => ({
  useOrganizationLogo: () => logo
}));

const organization = {
  id: 'organization-a',
  name: 'Original name',
  slug: 'original-slug'
} as ActiveOrganization;

beforeEach(() => {
  vi.clearAllMocks();
  auth.list.mockResolvedValue({
    data: [organization, { id: 'organization-b', name: 'Other group', slug: 'other-group' }],
    error: null
  });
  auth.remove.mockResolvedValue({ data: {}, error: null });
  auth.setActive.mockResolvedValue({ data: {}, error: null });
  auth.update.mockResolvedValue({ data: {}, error: null });
  logo.clear.mockResolvedValue(undefined);
  logo.upload.mockResolvedValue('https://example.com/group.png');
});

describe('useOrganizationSettings', () => {
  test('trims and persists edited organization settings', async () => {
    const { result } = renderHook(() => useOrganizationSettings(organization));
    act(() =>
      result.current.updateState({
        name: '  Updated name  ',
        slug: '  updated-slug  '
      })
    );

    await act(() => result.current.save());

    expect(auth.update).toHaveBeenCalledWith({
      data: {
        name: 'Updated name',
        slug: 'updated-slug'
      },
      organizationId: 'organization-a'
    });
    expect(result.current.state).toMatchObject({
      error: null,
      isPending: false,
      message: 'Group settings saved.'
    });
  });

  test('surfaces Better Auth errors without leaving the form pending', async () => {
    auth.update.mockResolvedValue({ data: null, error: { message: 'Slug already exists' } });
    const { result } = renderHook(() => useOrganizationSettings(organization));

    await act(() => result.current.save());

    expect(result.current.state).toMatchObject({
      error: 'Slug already exists',
      isPending: false,
      message: null
    });
  });

  test('uploads and references a Convex media logo', async () => {
    const { result } = renderHook(() => useOrganizationSettings(organization));
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await act(() => result.current.uploadLogo(file));

    expect(logo.upload).toHaveBeenCalledWith(file);
    expect(result.current.state).toMatchObject({
      logo: 'https://example.com/group.png',
      message: 'Group logo updated.'
    });
  });

  test('clears the organization logo through the media hook', async () => {
    const { result } = renderHook(() => useOrganizationSettings(organization));
    act(() => result.current.updateState({ logo: 'https://example.com/group.png' }));

    await act(() => result.current.clearLogo());

    expect(logo.clear).toHaveBeenCalledOnce();
    expect(result.current.state).toMatchObject({
      logo: '',
      message: 'Group logo removed.'
    });
  });

  test('keeps the form usable when uploading or clearing a logo fails', async () => {
    logo.upload.mockRejectedValueOnce(new Error('Server Error'));
    logo.clear.mockRejectedValueOnce(new Error('Storage unavailable'));
    const { result } = renderHook(() => useOrganizationSettings(organization));
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await act(() => result.current.uploadLogo(file));
    expect(result.current.state).toMatchObject({
      error: 'Unable to update group logo',
      isPending: false,
      message: null
    });

    await act(() => result.current.clearLogo());
    expect(result.current.state).toMatchObject({
      error: 'Storage unavailable',
      isPending: false,
      message: null
    });
  });

  test('switches to a fallback before deleting the selected organization', async () => {
    const { result } = renderHook(() => useOrganizationSettings(organization));

    await act(() => result.current.remove());

    expect(auth.setActive).toHaveBeenCalledWith({ organizationId: 'organization-b' });
    expect(auth.remove).toHaveBeenCalledWith({ organizationId: 'organization-a' });
    expect(auth.setActive.mock.invocationCallOrder[0]).toBeLessThan(
      auth.remove.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
  });

  test('deletes the final organization without switching first', async () => {
    auth.list.mockResolvedValue({ data: [organization], error: null });
    const { result } = renderHook(() => useOrganizationSettings(organization));

    await act(() => result.current.remove());

    expect(auth.setActive).not.toHaveBeenCalled();
    expect(auth.remove).toHaveBeenCalledWith({ organizationId: organization.id });
    expect(result.current.state).toMatchObject({ error: null, message: null });
  });

  test('surfaces list, activation, and deletion failures when removing a group', async () => {
    const { result } = renderHook(() => useOrganizationSettings(organization));
    auth.list.mockResolvedValueOnce({ data: null, error: { message: 'Cannot list groups' } });

    await act(() => result.current.remove());
    expect(result.current.state.error).toBe('Cannot list groups');

    auth.list.mockResolvedValueOnce({
      data: [organization, { id: 'organization-b', name: 'Other group', slug: 'other-group' }],
      error: null
    });
    auth.setActive.mockResolvedValueOnce({
      data: null,
      error: { message: 'Cannot switch groups' }
    });
    await act(() => result.current.remove());
    expect(result.current.state.error).toBe('Cannot switch groups');

    auth.list.mockResolvedValueOnce({ data: [organization], error: null });
    auth.remove.mockResolvedValueOnce({ data: null, error: { message: 'Cannot delete group' } });
    await act(() => result.current.remove());
    expect(result.current.state.error).toBe('Cannot delete group');
  });
});
