import { expect, test } from 'vitest';
import { cancelInvitationKey } from './group-action-keys';

test('builds a stable pending-action key for invitation rows', () => {
  expect(cancelInvitationKey('invite-a')).toBe('invite-invite-a');
});
