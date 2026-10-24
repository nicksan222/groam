import { render } from '@groam/vitest-config/react';
import { useRef } from 'react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { useChatPopupDismissal } from './use-chat-popup-dismissal';

function Scroller({ active, onDismiss }: { active: boolean; onDismiss: () => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  useChatPopupDismissal(active, triggerRef, onDismiss);
  return (
    <>
      <div data-testid="scroller" style={{ height: 100, overflowY: 'auto' }}>
        <div style={{ height: 400 }}>
          <button ref={triggerRef} type="button">
            Trigger
          </button>
          <span data-testid="text">Message</span>
          <input aria-label="Message draft" />
        </div>
      </div>
      <div data-testid="elsewhere" style={{ height: 100, overflowY: 'auto' }}>
        <div style={{ height: 400 }}>
          <span data-testid="other">Other</span>
        </div>
      </div>
      <div data-slot="popover-popup">
        <span data-testid="popup">Popup</span>
      </div>
    </>
  );
}

const byTestId = (id: string) => {
  const element = document.querySelector(`[data-testid="${id}"]`);
  if (!element) throw new Error(`Missing ${id}`);
  return element;
};

const wheel = (target: Element) =>
  target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 10 }));

const key = (target: Element, init: KeyboardEventInit) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));

afterEach(() => {
  vi.restoreAllMocks();
});

test('dismisses on wheel input in the scroller that holds the trigger', async () => {
  const onDismiss = vi.fn();
  await render(<Scroller active onDismiss={onDismiss} />);
  wheel(byTestId('text'));
  expect(onDismiss).toHaveBeenCalledOnce();
});

test('ignores scrolling in other scrollers and inside popups', async () => {
  const onDismiss = vi.fn();
  await render(<Scroller active onDismiss={onDismiss} />);
  wheel(byTestId('other'));
  wheel(byTestId('popup'));
  expect(onDismiss).not.toHaveBeenCalled();
});

test('dismisses on scroll keys but not on typing or modified keys', async () => {
  const onDismiss = vi.fn();
  await render(<Scroller active onDismiss={onDismiss} />);
  key(byTestId('text'), { key: 'a' });
  key(byTestId('text'), { ctrlKey: true, key: 'End' });
  key(byTestId('scroller').querySelector('input') as Element, { key: 'ArrowDown' });
  expect(onDismiss).not.toHaveBeenCalled();
  key(byTestId('text'), { key: 'PageDown' });
  expect(onDismiss).toHaveBeenCalledOnce();
});

test('dismisses a wheel over the trigger scroller even from a backdrop outside it', async () => {
  const onDismiss = vi.fn();
  await render(<Scroller active onDismiss={onDismiss} />);
  const backdrop = document.createElement('div');
  document.body.append(backdrop);
  const bounds = byTestId('scroller').getBoundingClientRect();
  backdrop.dispatchEvent(
    new WheelEvent('wheel', {
      bubbles: true,
      clientX: bounds.left + 5,
      clientY: bounds.top + 5
    })
  );
  expect(onDismiss).toHaveBeenCalledOnce();
  backdrop.remove();
});

test('does nothing while inactive', async () => {
  const onDismiss = vi.fn();
  await render(<Scroller active={false} onDismiss={onDismiss} />);
  wheel(byTestId('text'));
  expect(onDismiss).not.toHaveBeenCalled();
});
