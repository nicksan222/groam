import { afterEach, expect, test, vi } from 'vitest';
import { createSlug } from './workspace-state';

afterEach(() => vi.restoreAllMocks());

test('createSlug normalizes a workspace name and adds a collision-resistant suffix', () => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('abcdef12-3456-4789-abcd-ef1234567890');

  expect(createSlug('  Product & Growth / Europe  ')).toBe('product-growth-europe-abcdef');
});

test('createSlug bounds long names and falls back for names without URL-safe characters', () => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-3456-4789-abcd-ef1234567890');

  expect(createSlug('x'.repeat(80))).toBe(`${'x'.repeat(40)}-123456`);
  expect(createSlug(' 🚀 ')).toBe('workspace-123456');
});
