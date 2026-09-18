import { afterEach, expect, test, vi } from 'vitest';
import { downloadTextFile } from './download-text-file';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('downloads text through a temporary object URL', () => {
  const createObjectURL = vi.fn(() => 'blob:download');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  downloadTextFile('codes.txt', 'one\ntwo');

  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
  expect(document.querySelector('a[download="codes.txt"]')).toBeNull();
});
