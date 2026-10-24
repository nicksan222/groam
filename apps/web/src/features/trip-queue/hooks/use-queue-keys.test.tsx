import { renderHook } from '@groam/vitest-config/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useQueueKeys } from './use-queue-keys';

const handlers = {
  clearSelection: vi.fn(),
  move: vi.fn(),
  toggleSelect: vi.fn()
};

const mount = (overrides: Partial<Parameters<typeof useQueueKeys>[0]> = {}) =>
  renderHook(() =>
    useQueueKeys({
      addable: true,
      cursor: 'issue-1',
      selectable: true,
      selectedCount: 0,
      ...handlers,
      ...overrides
    })
  );

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  document.body.innerHTML = '';
});

describe('useQueueKeys', () => {
  test.each([
    ['ArrowDown', 1],
    ['ArrowUp', -1]
  ])('%s moves the cursor by %i', async (key, step) => {
    await mount();
    expect(press(key).defaultPrevented).toBe(true);
    expect(handlers.move).toHaveBeenCalledWith(step);
  });

  test('x toggles the cursor row', async () => {
    await mount();
    press('x');
    expect(handlers.toggleSelect).toHaveBeenCalledWith('issue-1');
  });

  test('x does nothing when no row can be selected', async () => {
    await mount({ selectable: false });
    press('x');
    expect(handlers.toggleSelect).not.toHaveBeenCalled();
  });

  test('Esc clears a selection before it lets go of focus', async () => {
    await mount({ selectedCount: 2 });
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(handlers.clearSelection).toHaveBeenCalledOnce();
  });

  test('Esc blurs the focused element when nothing is selected', async () => {
    const button = document.body.appendChild(document.createElement('button'));
    button.focus();
    await mount();
    press('Escape');
    expect(handlers.clearSelection).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(button);
  });

  test('Enter clicks the cursor row title', async () => {
    document.body.innerHTML =
      '<div data-row-id="issue-1"><span data-slot="queue-title"></span></div>';
    const click = vi.fn();
    document.querySelector('[data-slot="queue-title"]')?.addEventListener('click', click);
    await mount();
    press('Enter');
    expect(click).toHaveBeenCalledOnce();
  });

  test('Enter leaves a focused button to open itself', async () => {
    document.body.innerHTML =
      '<div data-row-id="issue-1"><span data-slot="queue-title"></span></div><button id="b"></button>';
    const click = vi.fn();
    document.querySelector('[data-slot="queue-title"]')?.addEventListener('click', click);
    await mount();
    press('Enter', {}, document.getElementById('b') as HTMLElement);
    expect(click).not.toHaveBeenCalled();
  });

  test('C focuses the add input', async () => {
    document.body.innerHTML = `<div><input data-slot="inline-add-input" id="add" /></div>`;
    const { testIds } = await import('@/lib/test-ids');
    document.body.firstElementChild?.setAttribute('data-testid', testIds.queuePanel);
    await mount();
    expect(press('c').defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('add');
  });

  test('C does nothing when questions cannot be added', async () => {
    await mount({ addable: false });
    expect(press('c').defaultPrevented).toBe(false);
  });

  test('ignores keys typed into a field and keys with a modifier', async () => {
    const input = document.body.appendChild(document.createElement('input'));
    await mount();
    press('ArrowDown', {}, input);
    press('ArrowDown', { metaKey: true });
    press('ArrowDown', { ctrlKey: true });
    expect(handlers.move).not.toHaveBeenCalled();
  });

  test('ignores keys pressed inside a confirm dialog', async () => {
    const dialog = document.body.appendChild(document.createElement('div'));
    dialog.setAttribute('role', 'alertdialog');
    const inner = dialog.appendChild(document.createElement('span'));
    await mount();
    press('ArrowDown', {}, inner);
    expect(handlers.move).not.toHaveBeenCalled();
  });

  test('stops listening on unmount', async () => {
    const { unmount } = await mount();
    await unmount();
    press('ArrowDown');
    expect(handlers.move).not.toHaveBeenCalled();
  });
});
