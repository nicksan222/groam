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
  user: {
    email: 'dana@example.com',
    image: null as string | null,
    name: 'Dana Demo',
    username: 'dana' as string | null
  }
}));

vi.mock('@groam/auth/client', () => ({ authClient: { signOut: state.signOut } }));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: state.toastError } }));
vi.mock('./workspace-state', () => ({
  useWorkspace: () => ({ session: { user: state.user } })
}));

beforeEach(() => {
  state.signOut.mockReset();
  state.signOut.mockResolvedValue({ error: null });
  state.toastError.mockClear();
  state.user = { email: 'dana@example.com', image: null, name: 'Dana Demo', username: 'dana' };
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
  test('shows the email under the name', async () => {
    await mount();
    await expect.element(page.getByRole('menu').getByText('dana@example.com')).toBeVisible();
  });

  test('does not duplicate the sidebar Settings link in the account menu', async () => {
    await mount();
    await expect
      .element(page.getByRole('menuitem', { name: 'Settings', exact: true }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
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
