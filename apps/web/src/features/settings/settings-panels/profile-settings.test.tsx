import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

describe('ProfileSettings', () => {
  test('renders editable profile and username fields', () => {
    render(<ProfileSettings user={user} />);

    expect(screen.getByLabelText('Display name')).toBeTruthy();
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Profile photo URL')).toBeTruthy();
    expect(screen.getByDisplayValue('traveler')).toBeTruthy();
  });

  test('submits the profile form through the settings hook', async () => {
    render(<ProfileSettings user={user} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(profile.save).toHaveBeenCalledOnce());
  });

  test('shows validation feedback from the settings hook', () => {
    profile.state = {
      ...profile.state,
      error: 'Unable to update profile'
    };

    render(<ProfileSettings user={user} />);

    expect(screen.getByRole('alert').textContent).toBe('Unable to update profile');
  });
});
