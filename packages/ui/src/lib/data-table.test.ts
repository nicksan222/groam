import { expect, test } from 'vite-plus/test';
import {
  dataTableChromeClassName,
  dataTableTableClassName,
  dataTableTableContainerClassName
} from './data-table';

test('data table chrome clips the panel around its separate body scroll host', () => {
  expect(dataTableChromeClassName).toContain('overflow-hidden');
  expect(dataTableTableContainerClassName).toContain('overflow-x-visible');
  expect(dataTableTableContainerClassName).not.toContain('overflow-x-auto');
});

test('data table adapts to the available width without trailing inset', () => {
  expect(dataTableTableClassName).toContain('w-full');
  expect(dataTableTableClassName).not.toContain('w-max');
  expect(dataTableTableClassName).toContain('min-w-0');
  expect(dataTableTableClassName).not.toContain('pr-3');
});

test('data table container fills chrome without nested scroll', () => {
  expect(dataTableTableContainerClassName).toContain('w-full');
  expect(dataTableTableContainerClassName).not.toContain('w-max');
});
