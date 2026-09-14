import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBackendActions } from './backend-app-actions';
import { backendConfig, jsonResponse, owner } from './backend-test-fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('getConvexToken', () => {
  test('obtains the authenticated user Convex JWT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ token: 'convex-jwt' }))
    );

    await expect(createBackendActions(backendConfig).getConvexToken(owner)).resolves.toBe(
      'convex-jwt'
    );
  });
});
