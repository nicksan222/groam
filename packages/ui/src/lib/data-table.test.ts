import { expect, test } from 'vitest';
import {
  dataTableChromeClassName,
  dataTableTableClassName,
  dataTableTableContainerClassName
} from './data-table';

test('data table chrome is the sole horizontal scroll container', () => {
  expect(dataTableChromeClassName).toContain('overflow-x-auto');
  expect(dataTableTableContainerClassName).toContain('overflow-x-visible');
  expect(dataTableTableContainerClassName).not.toContain('overflow-x-auto');
});

test('data table keeps intrinsic width floor without trailing inset', () => {
  expect(dataTableTableClassName).toContain('w-full');
  expect(dataTableTableClassName).not.toContain('w-max');
  expect(dataTableTableClassName).toContain('min-w-[max(40rem,max-content)]');
  expect(dataTableTableClassName).not.toContain('pr-3');
});

test('data table container fills chrome without nested scroll', () => {
  expect(dataTableTableContainerClassName).toContain('w-full');
  expect(dataTableTableContainerClassName).not.toContain('w-max');
});
