import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { Session } from '@/features/workspace/workspace-shell/workspace-state';
import { ProfileSettings } from './profile-settings';

const profile = vi.hoisted(() => ({
  save: vi.fn(),
  state: {
    error: null as string | null,
    image: '',
    isPending: false,
    message: null as string | null,
    name: 'Traveler',
    username: 'traveler'
  },
  updateState: vi.fn()
}));

vi.mock('@/features/settings/hooks/use-profile-settings', () => ({
  useProfileSettings: () => profile
}));

const user = {
  email: 'traveler@example.com',
  image: null,
  name: 'Traveler',
  username: 'traveler'
} as Session['user'];

beforeEach(() => {
  vi.clearAllMocks();
  profile.save.mockResolvedValue(undefined);
  profile.state = {
    error: null,
    image: '',
    isPending: false,
    message: null,
    name: 'Traveler',
    username: 'traveler'
  };
});

describe('ProfileSettings', () => {
  test('renders editable profile and username fields', async () => {
    await render(<ProfileSettings user={user} />);

    await expect.element(page.getByLabelText('Display name')).toBeInTheDocument();
    await expect.element(page.getByLabelText('Username')).toBeInTheDocument();
    await expect.element(page.getByLabelText('Profile photo URL')).toBeInTheDocument();
    await expect.element(page.getByLabelText('Username')).toHaveValue('traveler');
  });

  test('submits the profile form through the settings hook', async () => {
    await render(<ProfileSettings user={user} />);

    await page.getByRole('button', { name: 'Save profile' }).click();

    await vi.waitFor(() => expect(profile.save).toHaveBeenCalledOnce());
  });

  test('shows validation feedback from the settings hook', async () => {
    profile.state = {
      ...profile.state,
      error: 'Unable to update profile'
    };

    await render(<ProfileSettings user={user} />);

    await expect.element(page.getByRole('alert')).toHaveTextContent('Unable to update profile');
  });
});
