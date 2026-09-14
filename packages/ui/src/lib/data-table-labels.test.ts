import { expect, test } from 'vitest';
import { dataTableFilterLabels } from './data-table';

test('derives standard filter labels from a resource name', () => {
  expect(dataTableFilterLabels({ plural: 'issues', singular: 'issue' })).toEqual({
    clearAriaLabel: 'Clear issue filters',
    empty: 'No matching issues.',
    filterAriaLabel: 'Search issues',
    filterPlaceholder: 'Search issues…',
    loadingAriaLabel: 'Loading issues…',
    toolbarAriaLabel: 'Filter issues'
  });
});

test('supports Filter placeholder prefix and custom loading aria label', () => {
  expect(
    dataTableFilterLabels(
      { loadingAriaLabel: 'Loading agent runs…', plural: 'runs', singular: 'run' },
      { filterPlaceholderPrefix: 'Filter' }
    )
  ).toEqual({
    clearAriaLabel: 'Clear run filters',
    empty: 'No matching runs.',
    filterAriaLabel: 'Filter runs',
    filterPlaceholder: 'Filter runs…',
    loadingAriaLabel: 'Loading agent runs…',
    toolbarAriaLabel: 'Filter runs'
  });
});
