import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBackendActions } from './backend-app-actions';
import { backendConfig, jsonResponse, owner, requestUrl } from './backend-test-fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('listWorkspaceMemberIds', () => {
  test('reads bounded member ids', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        members: [{ userId: 'user-owner' }, { userId: 'user-member' }],
        total: 2
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createBackendActions(backendConfig).listWorkspaceMemberIds(owner, 'organization-a')
    ).resolves.toEqual(new Set(['user-owner', 'user-member']));
    expect(requestUrl(fetchMock.mock.calls[0]?.[0])).toContain('limit=100');
    expect(requestUrl(fetchMock.mock.calls[0]?.[0])).toContain('offset=0');
  });

  test('paginates beyond the first 100 rows', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      userId: `user-${String(index).padStart(3, '0')}`
    }));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ members: firstPage, total: 101 }))
      .mockResolvedValueOnce(jsonResponse({ members: [{ userId: 'user-100' }], total: 101 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createBackendActions(backendConfig).listWorkspaceMemberIds(owner, 'organization-a')
    ).resolves.toEqual(new Set([...firstPage.map(({ userId }) => userId), 'user-100']));
    expect(requestUrl(fetchMock.mock.calls[1]?.[0])).toContain('offset=100');
  });
});
