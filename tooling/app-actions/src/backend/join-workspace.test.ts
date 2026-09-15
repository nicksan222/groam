import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBackendActions } from './backend-app-actions';
import {
  backendConfig,
  jsonResponse,
  member,
  owner,
  requestBody,
  workspace
} from './backend-test-fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('joinWorkspace', () => {
  test('invites a new user through Better Auth organization membership', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: 'invitation-a' }))
      .mockResolvedValueOnce(jsonResponse({ member: { id: 'member-a' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createBackendActions(backendConfig).joinWorkspace(owner, member, workspace, false)
    ).resolves.toBe('joined');
    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({
      email: member.email,
      organizationId: workspace.organizationId,
      role: 'member'
    });
    expect(requestBody(fetchMock.mock.calls[0])).not.toHaveProperty('teamId');
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Cookie')).toBe(member.cookie);
  });

  test('does not reinvite existing members', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createBackendActions(backendConfig).joinWorkspace(owner, member, workspace, true)
    ).resolves.toBe('existing');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
