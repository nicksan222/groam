import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SettingsStack } from './settings-stack';

afterEach(cleanup);

test('groups panels with vertical spacing', () => {
  const { container } = render(
    <SettingsStack>
      <p>First panel</p>
      <p>Second panel</p>
    </SettingsStack>
  );

  expect(container.firstElementChild?.className).toContain('space-y-5');
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-stack');
  expect(screen.getByText('First panel')).toBeTruthy();
  expect(screen.getByText('Second panel')).toBeTruthy();
});
