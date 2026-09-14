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
    name: 'Traveler'
  },
  updateState: vi.fn()
}));

vi.mock('@/features/settings/hooks/use-profile-settings', () => ({
  useProfileSettings: () => profile
}));

const user = {
  email: 'traveler@example.com',
  image: null,
  name: 'Traveler'
} as Session['user'];

beforeEach(() => {
  vi.clearAllMocks();
  profile.save.mockResolvedValue(undefined);
  profile.state = {
    error: null,
    image: '',
    isPending: false,
    message: null,
    name: 'Traveler'
  };
});

afterEach(cleanup);

describe('ProfileSettings', () => {
  test('renders profile fields and read-only email', () => {
    render(<ProfileSettings user={user} />);

    expect(screen.getByLabelText('Display name')).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.getByLabelText('Profile photo URL')).toBeTruthy();
    expect(screen.getByDisplayValue('traveler@example.com')).toBeTruthy();
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
