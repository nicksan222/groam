import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useSwitchGroup } from './use-switch-group';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  switchOrganization: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('@/lib/navigation/router', () => ({ useNavigate: () => state.navigate }));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: state.toastError } }));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ switchOrganization: state.switchOrganization })
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.switchOrganization.mockResolvedValue(undefined);
});

describe('useSwitchGroup', () => {
  test('switches and goes home by default', async () => {
    const { result } = await renderHook(() => useSwitchGroup());
    expect(await result.current('org-1')).toBe(true);
    expect(state.switchOrganization).toHaveBeenCalledWith('org-1');
    expect(state.navigate).toHaveBeenCalledWith({ to: '/' });
  });

  test('can stay where it is', async () => {
    const { result } = await renderHook(() => useSwitchGroup());
    expect(await result.current('org-1', { goHome: false })).toBe(true);
    expect(state.navigate).not.toHaveBeenCalled();
  });

  test('starts going home together with the switch, not after it', async () => {
    let finish!: () => void;
    state.switchOrganization.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    const { result } = await renderHook(() => useSwitchGroup());
    const switching = result.current('org-1');
    expect(state.navigate).toHaveBeenCalledWith({ to: '/' });
    finish();
    expect(await switching).toBe(true);
  });

  test('toasts the reason when switching fails', async () => {
    state.switchOrganization.mockRejectedValue(new Error('Forbidden'));
    const { result } = await renderHook(() => useSwitchGroup());
    expect(await result.current('org-1')).toBe(false);
    expect(state.toastError).toHaveBeenCalledWith('Forbidden');
  });
});
