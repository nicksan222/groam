import { expect, test } from 'vitest';
import { orderSidebarItems } from './sidebar-nested-nav';

test('orderSidebarItems pins favourites above recency-sorted items', () => {
  const items = orderSidebarItems([
    { favorite: false, id: 'a', lastUpdatedAt: 300, name: 'Recent' },
    { favorite: true, id: 'b', lastUpdatedAt: 100, name: 'Pinned' },
    { favorite: false, id: 'c', lastUpdatedAt: 200, name: 'Middle' }
  ]);

  expect(items.map((item) => item.id)).toEqual(['b', 'a', 'c']);
});

test('orderSidebarItems does not mutate the source array', () => {
  const source = [
    { favorite: false, id: 'a', lastUpdatedAt: 100 },
    { favorite: false, id: 'b', lastUpdatedAt: 200 }
  ];

  const sorted = orderSidebarItems(source);

  expect(sorted).not.toBe(source);
  expect(source.map((item) => item.id)).toEqual(['a', 'b']);
});
