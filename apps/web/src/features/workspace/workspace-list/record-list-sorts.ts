import type { RecordListSort } from '@groam/ui/lib/record-list';

/** Sort the records already loaded; the initial order preserves source and viewer priorities. */
export function recordListSorts<
  T extends { title: string; updatedAt?: number }
>(): RecordListSort<T>[] {
  return [
    { label: 'Default order', value: 'default' },
    {
      compare: (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
      label: 'Recently updated',
      value: 'recent'
    },
    {
      compare: (a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
      label: 'Oldest updated',
      value: 'oldest'
    },
    { compare: (a, b) => a.title.localeCompare(b.title), label: 'Title A–Z', value: 'title' }
  ];
}
