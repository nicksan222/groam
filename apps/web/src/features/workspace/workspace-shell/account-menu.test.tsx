import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SessionChangeContext } from '@/features/auth/session-change-context';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { AccountMenu } from './account-menu';

const state = vi.hoisted(() => ({
  signOut: vi.fn(),
  toastError: vi.fn(),
  user: { image: null as string | null, name: 'Dana Demo', username: 'dana' as string | null }
}));
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@groam/auth/client', () => ({ authClient: { signOut: state.signOut } }));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: state.toastError } }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('./workspace-state', () => ({
  useWorkspace: () => ({ session: { user: state.user } })
}));

beforeEach(() => {
  state.signOut.mockReset();
  state.signOut.mockResolvedValue({ error: null });
  state.toastError.mockClear();
  navigate.mockClear();
  state.user = { image: null, name: 'Dana Demo', username: 'dana' };
  useAuthFormStore.getState().reset();
});

async function mount(changeSession?: (request: () => Promise<unknown>) => Promise<unknown>) {
  const tree = (
    <SidebarProvider>
      <AccountMenu />
    </SidebarProvider>
  );
  await render(
    changeSession ? (
      <SessionChangeContext value={changeSession as never}>{tree}</SessionChangeContext>
    ) : (
      tree
    )
  );
  await page.getByTestId('nav-user-trigger').click();
}

describe('AccountMenu', () => {
  test.each([
    ['username', 'dana', '@dana'],
    ['name when no username', null, 'Dana Demo']
  ])('shows the identity by %s', async (_, username, detail) => {
    state.user = { image: null, name: 'Dana Demo', username };
    await mount();
    await expect.element(page.getByRole('menu').getByText(detail).last()).toBeVisible();
  });

  test('settings navigates to the profile section', async () => {
    await mount();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'profile' },
      to: '/settings/$section'
    });
  });

  test('sign out resets the auth form and signs out', async () => {
    useAuthFormStore.getState().patch({ identifier: 'typed@example.com' });
    await mount();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect.poll(() => state.signOut.mock.calls.length).toBe(1);
    expect(useAuthFormStore.getState().identifier).toBe('');
    expect(state.toastError).not.toHaveBeenCalled();
  });

  test.each([
    [
      'an error result',
      () => state.signOut.mockResolvedValue({ error: { message: 'Session busy' } }),
      'Session busy'
    ],
    [
      'an error result without message',
      () => state.signOut.mockResolvedValue({ error: {} }),
      'Unable to sign out'
    ],
    ['a thrown error', () => state.signOut.mockRejectedValue(new Error('Offline')), 'Offline']
  ])('toasts %s', async (_, arrange, message) => {
    arrange();
    await mount();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect.poll(() => state.toastError.mock.calls).toEqual([[message]]);
  });

  test('routes sign out through the session change context', async () => {
    const changeSession = vi.fn((request: () => Promise<unknown>) => request());
    await mount(changeSession);
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect.poll(() => changeSession.mock.calls.length).toBe(1);
  });
});
