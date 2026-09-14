import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBackendActions } from './backend-app-actions';
import { backendConfig, jsonResponse, owner, requestBody } from './backend-test-fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('ensureWorkspace', () => {
  test('reuses the demo organization and activates it', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse([{ id: 'organization-a', name: 'Groam Demo', slug: 'groam-demo' }])
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'organization-a' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createBackendActions(backendConfig).ensureWorkspace(owner, {
        createIfMissing: true,
        name: 'Groam Demo'
      })
    ).resolves.toMatchObject({
      organizationId: 'organization-a',
      organizationName: 'Groam Demo'
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestBody(fetchMock.mock.calls[1])).toEqual({ organizationId: 'organization-a' });
  });

  test('creates a deterministic organization when the owner has none', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ id: 'organization-new', name: 'Groam Demo', slug: 'groam-demo-stable' })
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'organization-new' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createBackendActions(backendConfig).ensureWorkspace(owner, {
      createIfMissing: true,
      name: 'Groam Demo'
    });

    expect(result).toMatchObject({ organizationId: 'organization-new' });
    expect(requestBody(fetchMock.mock.calls[1])).toMatchObject({
      name: 'Groam Demo',
      slug: expect.stringMatching(/^groam-demo-/u)
    });
  });

  test('refuses to create a missing workspace when creation is disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          jsonResponse([{ id: 'organization-other', name: 'Other', slug: 'other' }])
        )
    );

    await expect(
      createBackendActions(backendConfig).ensureWorkspace(owner, {
        createIfMissing: false,
        name: 'Groam Demo'
      })
    ).rejects.toThrow('Workspace "Groam Demo" does not exist and creation is disabled');
  });
});
