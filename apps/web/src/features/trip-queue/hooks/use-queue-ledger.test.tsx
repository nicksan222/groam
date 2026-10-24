import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import type { QueueGroup, QueueItem } from '@/types/queue';
import { useQueueLedger } from './use-queue-ledger';

const item = (id: string) => ({ id }) as unknown as QueueItem;
const groups: QueueGroup[] = [
  { items: [item('a'), item('b')], label: 'Open' },
  { items: [item('c')], label: 'Done' }
];

const mount = (
  selectable: string[] = ['a', 'b', 'c'],
  list: QueueGroup[] = groups,
  searching = false
) =>
  renderHook(
    (props: { groups: QueueGroup[] }) =>
      useQueueLedger({
        addable: false,
        groups: props.groups,
        searching,
        selectableIds: new Set(selectable)
      }),
    { initialProps: { groups: list } }
  );

describe('useQueueLedger', () => {
  test('starts with no cursor, selection, or folded group', async () => {
    const { result } = await mount();
    expect(result.current.cursor).toBeNull();
    expect(result.current.selected.size).toBe(0);
    expect(result.current.collapsed.size).toBe(0);
  });

  test('toggles selection of selectable rows only, and clears it', async () => {
    const { result } = await mount(['a']);
    await act(async () => {
      result.current.toggleSelect('a');
      result.current.toggleSelect('b');
    });
    expect([...result.current.selected]).toEqual(['a']);
    await act(async () => result.current.toggleSelect('a'));
    expect(result.current.selected.size).toBe(0);

    await act(async () => result.current.toggleSelect('a'));
    await act(async () => result.current.clearSelection());
    expect(result.current.selected.size).toBe(0);
  });

  test('deselects given ids and drops rows that are no longer listed', async () => {
    const { result, rerender } = await mount();
    await act(async () => {
      for (const id of ['a', 'b', 'c']) result.current.toggleSelect(id);
    });
    await act(async () => result.current.deselect(['a']));
    expect([...result.current.selected]).toEqual(['b', 'c']);

    await rerender({ groups: [{ items: [item('b')], label: 'Open' }] });
    expect([...result.current.selected]).toEqual(['b']);
  });

  test('moves the cursor through rows, clamped at both ends', async () => {
    document.body.innerHTML = '';
    const { result } = await mount();
    const keys = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await act(async () => keys('ArrowDown'));
    expect(result.current.cursor).toBe('a');
    await act(async () => keys('ArrowDown'));
    await act(async () => keys('ArrowDown'));
    await act(async () => keys('ArrowDown'));
    expect(result.current.cursor).toBe('c');
    await act(async () => keys('ArrowUp'));
    expect(result.current.cursor).toBe('b');
  });

  test('starts from the last row when moving up with no cursor', async () => {
    const { result } = await mount();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.cursor).toBe('c');
  });

  test('folded groups are skipped by the cursor and a hidden cursor row is dropped', async () => {
    const { result } = await mount();
    await act(async () => result.current.setCursor('c'));
    expect(result.current.cursor).toBe('c');
    await act(async () => result.current.toggleGroup('done'));
    expect(result.current.collapsed.has('done')).toBe(true);
    expect(result.current.cursor).toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.cursor).toBe('b');

    await act(async () => result.current.toggleGroup('done'));
    expect(result.current.collapsed.size).toBe(0);
  });

  test('selection drops rows in folded groups and keeps them when unfolded', async () => {
    const { result } = await mount();
    await act(async () => {
      result.current.toggleSelect('a');
      result.current.toggleSelect('c');
    });
    await act(async () => result.current.toggleGroup('done'));
    expect([...result.current.selected]).toEqual(['a']);
    await act(async () => result.current.toggleGroup('done'));
    expect([...result.current.selected]).toEqual(['a', 'c']);
  });

  test('a waiting group folds by one id whatever its label', async () => {
    const { result, rerender } = await mount(
      ['a'],
      [{ items: [item('a')], label: 'Waiting on others' }]
    );
    await act(async () => result.current.toggleGroup('open'));
    expect(result.current.collapsed.has('open')).toBe(true);
    await rerender({ groups: [{ items: [item('a')], label: 'Open' }] });
    expect(result.current.collapsed.has('open')).toBe(true);
  });

  test('nothing stays folded while searching, or when settled is the only group', async () => {
    const searching = await mount(['a', 'b', 'c'], groups, true);
    await act(async () => searching.result.current.toggleGroup('done'));
    expect(searching.result.current.collapsed.size).toBe(0);

    const { result } = await mount(['c'], [{ items: [item('c')], label: 'Settled' }]);
    await act(async () => result.current.toggleGroup('settled'));
    expect(result.current.collapsed.size).toBe(0);
  });
});
