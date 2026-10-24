import { expect, test } from 'vite-plus/test';
import { requiresVerifiedEmail } from './verification';

test('requires email ownership on every hosted site, even when email keys are absent', () => {
  expect(requiresVerifiedEmail('https://app.groam.app')).toBe(true);
  expect(requiresVerifiedEmail('https://preview.example.org')).toBe(true);
  expect(requiresVerifiedEmail('http://localhost:5173')).toBe(false);
  expect(requiresVerifiedEmail('http://127.0.0.1:5173')).toBe(false);
});
