import { expect, test } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { openSite } from './site-frame';

test('AI has a direct navigation link and is the current page', async () => {
  const { site, document } = await openSite('/features/ai/');
  const navigation = site.getByRole('navigation', { name: 'Main', exact: true });
  await expect
    .element(navigation.getByRole('link', { name: 'AI', exact: true }))
    .toHaveAttribute('href', '/features/ai/');
  const current = document.querySelectorAll('nav[aria-label="Main"] a[aria-current="page"]');
  expect(current).toHaveLength(1);
  expect(current[0]?.getAttribute('href')).toBe('/features/ai/');
});

test('the pricing calculator charges €1 per invited traveler for the trip', async () => {
  const { site, document } = await openSite('/pricing/');
  const total = () => document.querySelector('[data-total]')?.textContent?.trim();
  await expect.poll(total).toBe('€3 for this trip.');

  await site.getByRole('button', { name: 'One more traveler invited' }).click();
  await expect.poll(total).toBe('€4 for this trip.');

  await site.getByRole('button', { name: 'One fewer traveler invited' }).click();
  await site.getByRole('button', { name: 'One fewer traveler invited' }).click();
  await site.getByRole('button', { name: 'One fewer traveler invited' }).click();
  await expect.poll(total).toBe('€1 for this trip.');

  await site.getByRole('button', { name: 'One fewer traveler invited' }).click();
  await expect.poll(total).toBe('€0 for this trip.');
});

test('pricing explains conditional checkout without collecting payment details', async () => {
  const { document } = await openSite('/pricing/');
  expect(document.querySelector('form, input[autocomplete^="cc-"]')).toBeNull();
  expect(document.body.textContent).toContain(
    'One-time checkout when payments are enabled. Existing trips stay free.'
  );
});

test('the mobile menu opens, lists every feature, and closes with Escape', async () => {
  const { site, document } = await openSite('/', { width: 390, height: 844 });
  const toggle = site.getByLabelText('Menu');
  await toggle.click();
  const menu = document.querySelector<HTMLDetailsElement>('[data-site-menu]');
  expect(menu?.open).toBe(true);
  for (const name of ['Itinerary', 'Ideas', 'Issues', 'Chat', 'AI']) {
    const link = [...(menu?.querySelectorAll('a') ?? [])].find(
      (a) => a.textContent?.trim() === name
    );
    expect(link?.checkVisibility(), `${name} in the menu`).toBe(true);
  }
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => menu?.open).toBe(false);
});

test('the skip link moves focus past the navigation', async () => {
  const { site, document } = await openSite('/');
  const skip = site.getByRole('link', { name: 'Skip to content' });
  await expect.element(skip).toHaveAttribute('href', '#content');
  expect(document.getElementById('content')?.tagName).toBe('MAIN');
});

test('the home activity log keeps playing, and stops when paused', async () => {
  const { site, document } = await openSite('/');
  const log = document.querySelector<HTMLElement>('[data-activity-log]');
  if (!log) throw new Error('Activity log missing');
  // The log sits below the hero and only plays while on screen.
  log.scrollIntoView({ block: 'center' });
  const text = () => log.querySelector('[data-entries]')?.textContent;
  const first = text();
  await expect.poll(text, { timeout: 8_000 }).not.toBe(first);

  await site.getByRole('button', { name: /pause activity/iu }).click();
  const paused = text();
  await new Promise((resolve) => setTimeout(resolve, 4_000));
  expect(text()).toBe(paused);
});

test('the ideas demo moves back and forth between states', async () => {
  const { site, document } = await openSite('/features/ideas/');
  const demo = document.querySelector<HTMLElement>('[data-ideas]');
  await site.getByRole('button', { name: 'Applied', exact: true }).click();
  await expect.poll(() => demo?.dataset.state).toBe('applied');
  await site.getByRole('button', { name: 'Proposed', exact: true }).click();
  await expect.poll(() => demo?.dataset.state).toBe('proposed');
});

test('every page with a looping demo offers a pause control', async () => {
  for (const path of [
    '/',
    '/features/',
    '/features/itinerary/',
    '/features/ideas/',
    '/features/issues/',
    '/features/conversations/',
    '/features/ai/',
    '/pricing/'
  ]) {
    const { site } = await openSite(path);
    await expect
      .element(site.getByRole('button', { name: /^(pause|play)/iu }).first(), { timeout: 5_000 })
      .toBeVisible();
  }
});

test('the mobile menu closes when the visitor clicks outside it', async () => {
  const { site, document } = await openSite('/', { width: 390, height: 844 });
  await site.getByLabelText('Menu').click();
  const menu = document.querySelector<HTMLDetailsElement>('[data-site-menu]');
  expect(menu?.open).toBe(true);
  document.querySelector('h1')?.click();
  await expect.poll(() => menu?.open).toBe(false);
});

test('screen tabs on the AI page move with the arrow keys', async () => {
  const { document } = await openSite('/features/ai/');
  const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
  expect(tabs.length).toBeGreaterThan(1);
  for (const tab of tabs) {
    expect(
      document.getElementById(tab.getAttribute('aria-controls') ?? '')?.getAttribute('role')
    ).toBe('tabpanel');
  }
  const first = tabs[0];
  first?.focus();
  first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await expect.poll(() => tabs[1]?.getAttribute('aria-selected')).toBe('true');
});

test('feature pages link on to the next feature', async () => {
  const order = ['itinerary', 'ideas', 'issues', 'conversations', 'ai'];
  for (const [index, slug] of order.entries()) {
    const { document } = await openSite(`/features/${slug}/`);
    const next = document.querySelector<HTMLAnchorElement>('a.next');
    expect(next?.getAttribute('href')).toBe(`/features/${order[(index + 1) % order.length]}/`);
  }
});

test('pressing Play on the home ribbon starts it moving again, even with the pointer on the button', async () => {
  const { document } = await openSite('/');
  const belt = document.querySelector<HTMLElement>('[data-ribbon] .belt');
  const offset = () => new DOMMatrix(getComputedStyle(belt ?? document.body).transform).m41;
  document.querySelector('[data-ribbon]')?.scrollIntoView({ block: 'center' });
  const toggleButton = document.querySelector<HTMLButtonElement>('[data-ribbon] [data-toggle]');
  toggleButton?.click();
  await expect.poll(() => toggleButton?.getAttribute('aria-pressed')).toBe('true');
  toggleButton?.click();
  const start = offset();
  await expect.poll(offset, { timeout: 4_000 }).not.toBe(start);
});

test('pressing Play on the features tour moves it on', async () => {
  const { document } = await openSite('/features/');
  const toggle = document.querySelector<HTMLButtonElement>('[data-hub-toggle]');
  toggle?.scrollIntoView({ block: 'center' });
  toggle?.click();
  const selected = () => document.querySelector('[data-item].active')?.textContent;
  const paused = selected();
  toggle?.click();
  await expect.poll(selected, { timeout: 8_000 }).not.toBe(paused);
});

test('the calculator handles a solo trip, a full group, and fast clicking', async () => {
  const { document } = await openSite('/pricing/');
  const total = () => document.querySelector('[data-total]')?.textContent?.trim();
  const button = (label: string) =>
    document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const roster = () => document.querySelectorAll('[data-roster] > li:not(.leaving)').length;
  for (let i = 0; i < 40; i += 1) button('One more traveler invited')?.click();
  await expect.poll(total).toBe('€30 for this trip.');
  for (let i = 0; i < 40; i += 1) button('One fewer traveler invited')?.click();
  await expect.poll(total).toBe('€0 for this trip.');
  button('One more traveler invited')?.click();
  button('One more traveler invited')?.click();
  await expect.poll(total).toBe('€2 for this trip.');
  // The organizer plus two invited travelers.
  await expect.poll(roster, { timeout: 2_000 }).toBe(3);
});

test('pause controls are large enough to tap on a phone', async () => {
  for (const path of [
    '/',
    '/features/ideas/',
    '/features/issues/',
    '/features/conversations/',
    '/features/ai/',
    '/pricing/'
  ]) {
    const { document } = await openSite(path, { width: 390, height: 844 });
    const toggles = [...document.querySelectorAll<HTMLButtonElement>('button')].filter((button) =>
      /^(pause|play)/iu.test(button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '')
    );
    for (const toggle of toggles.filter((button) => button.checkVisibility())) {
      const box = toggle.getBoundingClientRect();
      expect(
        Math.min(box.width, box.height),
        `${path} ${toggle.textContent?.trim()}`
      ).toBeGreaterThanOrEqual(24);
    }
  }
});
