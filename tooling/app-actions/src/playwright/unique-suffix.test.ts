import { expect, test, vi } from 'vitest';
import { uniqueSuffix } from './unique-suffix';

test('uses a cryptographically secure identifier', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_726_570_000_000);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('3d813cbb-47fb-42ba-91df-831e1593ac29');

  expect(uniqueSuffix('account-security')).toBe(
    'account-security-1726570000000-3d813cbb-47fb-42ba-91df-831e1593ac29'
  );
});
