import { expect, test, vi } from 'vite-plus/test';
import { uniqueSuffix } from './unique-suffix';

test('joins the label, the time and a random id', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_726_570_000_000);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('3d813cbb-47fb-42ba-91df-831e1593ac29');

  expect(uniqueSuffix('account-security')).toBe('account-security-1726570000000-3d813cbb');
});
