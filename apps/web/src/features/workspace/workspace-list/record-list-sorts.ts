import type { RecordListSort } from '@/types/record-list';

/** Common time/title orderings for records already loaded; features can prepend a priority order. */
export function recordListSorts<
  T extends { title: string; updatedAt?: number }
>(): RecordListSort<T>[] {
  return [
    {
      compare: (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
      label: 'Newest first',
      value: 'default'
    },
    {
      compare: (a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
      label: 'Oldest first',
      value: 'oldest'
    },
    { compare: (a, b) => a.title.localeCompare(b.title), label: 'Title A–Z', value: 'title' }
  ];
}
