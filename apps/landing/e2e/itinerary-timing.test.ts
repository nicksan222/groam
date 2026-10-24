import { expect, test } from 'vite-plus/test';
import { commands } from 'vite-plus/test/browser';
import { openSite } from './site-frame';

for (const path of ['/features/itinerary/', '/it/features/itinerary/']) {
  for (const width of [390, 1280]) {
    test(`${path} at ${width}px: times and highlights start at activity boundaries`, async () => {
      const { document } = await openSite(path, { width, reducedMotion: true });
      const root = document.querySelector<HTMLElement>('[data-itinerary]');
      const handle = root?.querySelector<HTMLElement>('[data-handle]');
      const cursor = root?.querySelector<HTMLElement>('[data-cursor]');
      if (!root || !handle || !cursor) throw new Error('Missing itinerary controls');
      expect(
        root.querySelector('[data-panel][data-active="true"] .slot')?.classList.contains('is-now')
      ).toBe(true);
      const key = (value: string) =>
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }));
      for (const panelId of ['fri', 'sat-before', 'sat-after', 'sun']) {
        const [day, variant] = panelId.split('-');
        root.querySelector<HTMLButtonElement>(`[data-day-btn="${day}"]`)?.click();
        if (variant) root.querySelector<HTMLButtonElement>(`[data-ba-btn="${variant}"]`)?.click();
        const panel = root.querySelector<HTMLElement>('[data-panel][data-active="true"]');
        const slots = [...(panel?.querySelectorAll<HTMLElement>('.slot') ?? [])];
        key('Home');
        for (const slot of slots) {
          expect(panel?.querySelectorAll('.is-now')).toHaveLength(1);
          expect(slot.classList.contains('is-now')).toBe(true);
          expect(cursor.getBoundingClientRect().top).toBeCloseTo(
            slot.getBoundingClientRect().top,
            0
          );
          expect(root.querySelector('[data-clock]')?.textContent).toBe(
            slot.querySelector('[data-slot-time]')?.textContent
          );
          key('PageDown');
        }
      }
      expect(await commands.takeErrors()).toEqual([]);
    });
  }
}

test('day changes reset the clock and highlight together without a stale frame', async () => {
  const { document } = await openSite('/features/itinerary/');
  const root = document.querySelector<HTMLElement>('[data-itinerary]');
  const handle = root?.querySelector<HTMLElement>('[data-handle]');
  if (!root || !handle) throw new Error('Missing itinerary controls');
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  for (const day of ['fri', 'sun', 'sat', 'fri']) {
    root.querySelector<HTMLButtonElement>(`[data-day-btn="${day}"]`)?.click();
    const panel = root.querySelector<HTMLElement>('[data-panel][data-active="true"]');
    expect(panel?.querySelector('.slot')?.classList.contains('is-now')).toBe(true);
    expect(root.querySelector('[data-cursor]')?.getBoundingClientRect().top).toBeCloseTo(
      panel?.querySelector('.slot')?.getBoundingClientRect().top ?? -1,
      0
    );
    expect(root.querySelector('[data-clock]')?.textContent).toBe(
      panel?.querySelector('[data-slot-time]')?.textContent
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
  const first = root.querySelector('[data-panel][data-active="true"] .slot');
  expect(root.querySelector('[data-cursor]')?.getBoundingClientRect().top).toBeCloseTo(
    first?.getBoundingClientRect().top ?? -1,
    0
  );
  expect(await commands.takeErrors()).toEqual([]);
});

test('the feature tour resumes the current interval and advances when its progress completes', async () => {
  const { document } = await openSite('/features/');
  const root = document.querySelector<HTMLElement>('[data-explorer]');
  const toggle = root?.querySelector<HTMLButtonElement>('[data-hub-toggle]');
  if (!root || !toggle) throw new Error('Missing feature tour');
  root.scrollIntoView({ block: 'center' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const selected = () => root.querySelector('[data-item].active');
  await expect.poll(() => selected()?.querySelector('.bar')?.getAnimations().length).toBe(1);
  await expect
    .poll(() => selected()?.querySelector('.bar')?.getAnimations()[0]?.playState)
    .toBe('running');
  const first = selected();
  toggle.click();
  const progress = first?.querySelector('.bar')?.getAnimations()[0];
  expect(progress?.playState).toBe('paused');
  toggle.click();
  expect(selected()).toBe(first);
  expect(progress?.playState).toBe('running');
  // Completing the visible interval must advance the selection in the same beat.
  progress?.finish();
  await expect.poll(selected).not.toBe(first);
  toggle.click();
  expect(await commands.takeErrors()).toEqual([]);
});
