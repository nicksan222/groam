import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createBackendActions } from './backend-app-actions';
import { backendConfig, member, owner, workspace } from './backend-test-fixtures';

const convex = vi.hoisted(() => ({
  memberMutation: vi.fn(),
  ownerMutation: vi.fn()
}));

vi.mock('./convex-client', () => ({
  authenticatedClient: vi
    .fn()
    .mockResolvedValueOnce({ mutation: convex.ownerMutation })
    .mockResolvedValueOnce({ mutation: convex.memberMutation })
}));

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => vi.clearAllMocks());

describe('joinWorkspace', () => {
  test('joins a seeded user through a generated invitation code', async () => {
    convex.ownerMutation.mockResolvedValue({ code: 'ABCD-EFGH-JKLM' });
    convex.memberMutation.mockResolvedValue({ organizationId: workspace.organizationId });

    await expect(
      createBackendActions(backendConfig).joinWorkspace(owner, member, workspace, false)
    ).resolves.toBe('joined');
    expect(convex.ownerMutation).toHaveBeenCalledWith(expect.anything(), { role: 'member' });
    expect(convex.memberMutation).toHaveBeenCalledWith(expect.anything(), {
      code: 'ABCD-EFGH-JKLM'
    });
  });

  test('does not reinvite existing members', async () => {
    await expect(
      createBackendActions(backendConfig).joinWorkspace(owner, member, workspace, true)
    ).resolves.toBe('existing');
    expect(convex.ownerMutation).not.toHaveBeenCalled();
    expect(convex.memberMutation).not.toHaveBeenCalled();
  });
});
