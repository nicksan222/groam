import { renderHook } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { useDocumentTitle } from './use-document-title';

test('sets the title while mounted and restores the previous one', async () => {
  document.title = 'Groam';
  const view = await renderHook(() => useDocumentTitle('Plan · Atlantic week'));
  expect(document.title).toBe('Plan · Atlantic week');
  await view.unmount();
  expect(document.title).toBe('Groam');
});

test('leaves the title alone without one', async () => {
  document.title = 'Groam';
  await renderHook(() => useDocumentTitle(undefined));
  expect(document.title).toBe('Groam');
});
