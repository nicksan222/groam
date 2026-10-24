import { afterEach, expect, test, vi } from 'vite-plus/test';
import { canSendEmail, isHostedSite, requiresVerifiedEmail } from './verification';

afterEach(() => {
  vi.unstubAllEnvs();
});

test('tells hosted sites from local development', () => {
  expect(isHostedSite('https://app.groam.app')).toBe(true);
  expect(isHostedSite('https://preview.example.org')).toBe(true);
  expect(isHostedSite('http://localhost:5173')).toBe(false);
  expect(isHostedSite('http://127.0.0.1:5173')).toBe(false);
});

test('can send email only when a Resend key is set', () => {
  vi.stubEnv('RESEND_API_KEY', '');
  expect(canSendEmail()).toBe(false);
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  expect(canSendEmail()).toBe(true);
});

test('requires email ownership on a hosted site only when mail can be delivered', () => {
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  expect(requiresVerifiedEmail('https://app.groam.app')).toBe(true);
  expect(requiresVerifiedEmail('http://localhost:5173')).toBe(false);
  vi.stubEnv('RESEND_API_KEY', '');
  expect(requiresVerifiedEmail('https://app.groam.app')).toBe(false);
  expect(requiresVerifiedEmail('http://localhost:5173')).toBe(false);
});
