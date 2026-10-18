import { expect, test } from 'vite-plus/test';
import { commands } from 'vite-plus/test/browser';
import { openSite } from './site-frame';

const pages = [
  '/',
  '/features/itinerary/',
  '/features/ideas/',
  '/features/issues/',
  '/features/conversations/'
];

test.each([390, 768, 1440])(
  'home sections meet without an empty bordered block at %ipx',
  async (width) => {
    const { document } = await openSite('/', { width, reducedMotion: true });
    const lastKind = document.querySelector('#tracked .kind:last-child');
    const intro = document.querySelector('.journey-section [data-section-heading]');
    if (!lastKind || !intro) throw new Error('Missing home section boundary');
    const gap = intro.getBoundingClientRect().top - lastKind.getBoundingClientRect().bottom;
    expect(gap).toBeGreaterThanOrEqual(24);
    expect(gap).toBeLessThanOrEqual(64);
    expect(document.defaultView?.getComputedStyle(intro).borderTopWidth).toBe('0px');
  }
);

test.each([320, 390, 768, 1440])(
  'home step navigation fits %ipx without an inner scrollbar',
  async (width) => {
    const { document } = await openSite('/', { width, reducedMotion: true });
    const rail = document.querySelector<HTMLElement>('[data-example-journey] .journey-rail');
    if (!rail) throw new Error('Missing journey navigation');
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    const bounds = rail.getBoundingClientRect();
    for (const step of rail.querySelectorAll('button')) {
      expect(step.getBoundingClientRect().left).toBeGreaterThanOrEqual(bounds.left);
      expect(step.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
    }
  }
);

test.each([320, 390, 768, 1440])(
  'AI step navigation fits %ipx without scrolling',
  async (width) => {
    const { document } = await openSite('/features/ai/', { width, reducedMotion: true });
    const rail = document.querySelector<HTMLElement>('[data-ai-journey] .step-controls');
    if (!rail) throw new Error('Missing AI journey navigation');
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    const backgroundRail = document.querySelector<HTMLElement>(
      '[data-ai-background] .background-controls'
    );
    expect(backgroundRail?.scrollWidth).toBeLessThanOrEqual(backgroundRail?.clientWidth ?? 0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
  }
);

test('resetting the mobile issue example cancels its pending scroll and allows another apply', async () => {
  const { document, window } = await openSite('/features/issues/', { width: 390, height: 844 });
  const flow = document.querySelector<HTMLElement>('[data-issue-flow]');
  const card = flow?.querySelector<HTMLElement>('[data-card]');
  const apply = card?.querySelector<HTMLButtonElement>('[data-apply-card]');
  const reset = flow?.querySelector<HTMLButtonElement>('[data-reset]');
  flow?.scrollIntoView({ block: 'start', behavior: 'instant' });
  apply?.click();
  await expect.poll(() => card?.dataset.state).toBe('closed');
  reset?.click();
  const position = window.scrollY;
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  expect(window.scrollY).toBe(position);
  expect(card?.dataset.state).toBe('open');
  apply?.click();
  await expect.poll(() => card?.dataset.state).toBe('closed');
});

test.each(pages)('%s: a longer example can be revised, applied, and replayed', async (path) => {
  const { document } = await openSite(path, { reducedMotion: true });
  const journey = document.querySelector<HTMLElement>('[data-example-journey]');
  expect(journey).not.toBeNull();
  const steps = [...(journey?.querySelectorAll<HTMLButtonElement>('[data-journey-step]') ?? [])];
  const panels = [...(journey?.querySelectorAll<HTMLElement>('[data-journey-panel]') ?? [])];
  expect(steps.length).toBeGreaterThanOrEqual(6);
  expect(panels).toHaveLength(steps.length);
  expect(steps.filter((step) => step.tabIndex === 0)).toEqual(
    steps.filter((step) => step.getAttribute('aria-pressed') === 'true')
  );
  expect(journey?.textContent).toContain('Example trip');
  const visible = () => panels.filter((panel) => panel.checkVisibility());
  expect(visible()).toHaveLength(1);
  steps[0]?.click();
  const originalPlan = panels[0]?.querySelector('[data-journey-plan] .plan-rows')?.textContent;
  expect(originalPlan).toBeTruthy();
  const appliedAt = panels.findIndex((panel) => panel.dataset.planState === 'applied');
  expect(appliedAt).toBeGreaterThanOrEqual(4);
  for (const [index, step] of steps.entries()) {
    step.click();
    expect(step.tabIndex).toBe(0);
    expect(steps.filter((control) => control.tabIndex === 0)).toHaveLength(1);
    expect(visible()).toHaveLength(1);
    expect(visible()[0]).toBe(panels[index]);
    if (index < appliedAt) {
      expect(visible()[0]?.dataset.planState).toMatch(/^(unchanged|preview)$/u);
      expect(visible()[0]?.querySelector('[data-journey-plan] .plan-rows')?.textContent).toBe(
        originalPlan
      );
    } else {
      expect(visible()[0]?.dataset.planState).toBe('applied');
    }
  }
  journey?.querySelector<HTMLButtonElement>('[data-journey-replay]')?.click();
  expect(visible()[0]).toBe(panels[0]);
  journey?.querySelector<HTMLButtonElement>('[data-journey-next]')?.click();
  expect(visible()[0]).toBe(panels[1]);
  journey?.querySelector<HTMLButtonElement>('[data-journey-prev]')?.click();
  expect(visible()[0]).toBe(panels[0]);
  expect(await commands.takeErrors()).toEqual([]);
});

test('the home story plays in view, has a full opening, and holds when paused', async () => {
  const { document } = await openSite('/');
  const journey = document.querySelector<HTMLElement>('[data-example-journey]');
  const current = () => journey?.dataset.current;
  const visible = () => journey?.querySelector<HTMLElement>('[data-journey-panel]:not([hidden])');
  expect(visible()?.querySelectorAll('.message').length).toBeGreaterThanOrEqual(3);
  expect(visible()?.querySelectorAll('.change-sheet li').length).toBeGreaterThanOrEqual(5);
  expect(journey?.dataset.playing).toBe('false');
  journey?.scrollIntoView({ block: 'center' });
  await expect.poll(() => journey?.dataset.playing).toBe('true');
  journey?.querySelector<HTMLButtonElement>('[data-journey-step][aria-pressed="true"]')?.click();
  expect(
    journey
      ?.querySelector('[aria-pressed="true"] .step-progress')
      ?.getAnimations()
      .some((animation) => animation.playState === 'running')
  ).toBe(true);
  const first = current();
  await expect.poll(current, { timeout: 8_000 }).not.toBe(first);
  journey?.querySelector<HTMLButtonElement>('[data-journey-toggle]')?.click();
  expect(journey?.dataset.playing).toBe('false');
  const paused = current();
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  expect(current()).toBe(paused);
  const toggle = journey?.querySelector<HTMLButtonElement>('[data-journey-toggle]');
  toggle?.focus();
  toggle?.click();
  await expect.poll(current, { timeout: 8_000 }).not.toBe(paused);
  document.defaultView?.scrollTo(0, 0);
  await expect.poll(() => journey?.dataset.playing).toBe('false');
});

test.each(['/', '/features/ai/'])(
  '%s: animated stories rest on the finished plan with reduced motion',
  async (path) => {
    const { document } = await openSite(path, { reducedMotion: true });
    const root = document.querySelector(
      path === '/' ? '[data-example-journey]' : '[data-ai-journey]'
    );
    const visible = root?.querySelector<HTMLElement>('[data-journey-panel]:not([hidden])');
    expect(root?.getAttribute('data-ai-state') ?? visible?.dataset.planState).toBe('applied');
    expect(root?.querySelector<HTMLButtonElement>('[data-journey-toggle]')?.checkVisibility()).toBe(
      false
    );
  }
);

test('the AI conversation animates in view and can be paused', async () => {
  const { document } = await openSite('/features/ai/');
  const journey = document.querySelector<HTMLElement>('[data-ai-journey]');
  const selected = () => journey?.dataset.current;
  journey?.scrollIntoView({ block: 'center' });
  const first = selected();
  await expect.poll(selected, { timeout: 8_000 }).not.toBe(first);
  journey?.querySelector<HTMLButtonElement>('[data-journey-toggle]')?.click();
  expect(journey?.querySelector('[data-journey-toggle]')?.getAttribute('aria-pressed')).toBe(
    'true'
  );
  const paused = selected();
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  expect(selected()).toBe(paused);
  const toggle = journey?.querySelector<HTMLButtonElement>('[data-journey-toggle]');
  toggle?.focus();
  toggle?.click();
  await expect.poll(selected, { timeout: 8_000 }).not.toBe(paused);
});

test('the AI conversation keeps earlier messages as new replies stack underneath', async () => {
  const { document } = await openSite('/features/ai/', { reducedMotion: true });
  const journey = document.querySelector<HTMLElement>('[data-ai-journey]');
  const steps = [...(journey?.querySelectorAll<HTMLButtonElement>('[data-journey-step]') ?? [])];
  const messages = [...(journey?.querySelectorAll<HTMLElement>('[data-journey-message]') ?? [])];
  const labels = steps.map((step) => step.textContent);
  const idea = journey?.querySelector('[data-journey-idea]');
  expect(steps.length).toBeGreaterThanOrEqual(8);
  expect(messages).toHaveLength(steps.length);
  steps[0]?.click();
  const agreedPlan = journey?.querySelector('[data-journey-plan]')?.textContent;
  for (const [index, step] of steps.entries()) {
    step.click();
    expect(journey?.dataset.current).toBe(String(index));
    expect(step.getAttribute('aria-pressed')).toBe('true');
    expect(steps.map((control) => control.textContent)).toEqual(labels);
    expect(idea?.querySelector('[data-idea-status]')?.textContent).toBe(step.dataset.ideaStatus);
    expect(idea?.querySelector('[data-idea-note]')?.textContent).toBe(step.dataset.ideaNote);
    expect(messages.filter((message) => message.checkVisibility())).toHaveLength(index + 1);
    for (const [previousIndex, message] of messages.slice(0, index + 1).entries()) {
      expect(journey?.querySelector(`[data-journey-message="${previousIndex}"]`)).toBe(message);
      expect(message.isConnected).toBe(true);
    }
    expect(journey?.dataset.aiState).toBe(index === steps.length - 1 ? 'applied' : 'unchanged');
    expect(
      journey?.querySelector('[data-plan-version="before"]')?.getAttribute('aria-hidden')
    ).toBe(String(index === steps.length - 1));
    if (index < steps.length - 1)
      expect(journey?.querySelector('[data-journey-plan]')?.textContent).toBe(agreedPlan);
  }
  steps[0]?.focus();
  steps[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(steps[1]?.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(steps[1]);
  expect(await commands.takeErrors()).toEqual([]);
});

test('the AI workspace explores research, polls, packing, budget, and trip setup', async () => {
  const { document } = await openSite('/features/ai/', { reducedMotion: true });
  const workspace = document.querySelector('[data-ai-demo]');
  for (const id of [
    'itinerary',
    'ideas',
    'issues',
    'research',
    'polls',
    'packing',
    'budget',
    'setup'
  ]) {
    const tab = workspace?.querySelector<HTMLButtonElement>(`[data-screen="${id}"]`);
    expect(tab).not.toBeNull();
    tab?.click();
    expect(tab?.getAttribute('aria-selected')).toBe('true');
    const panel = workspace?.querySelector<HTMLElement>(`[data-panel="${id}"]`);
    expect(panel?.checkVisibility()).toBe(true);
    expect(panel?.hasAttribute('data-off')).toBe(false);
    expect(panel?.querySelectorAll('[data-row]').length).toBeGreaterThan(0);
  }
  expect(await commands.takeErrors()).toEqual([]);
});

test('the background run shows its research and poll work in order', async () => {
  const { document } = await openSite('/features/ai/', { width: 390, reducedMotion: true });
  const run = document.querySelector<HTMLElement>('[data-ai-background]');
  expect(run).not.toBeNull();
  const steps = [...(run?.querySelectorAll<HTMLButtonElement>('[data-background-step]') ?? [])];
  expect(steps.length).toBeGreaterThanOrEqual(5);
  const evidence = [...(run?.querySelectorAll<HTMLElement>('[data-review-evidence]') ?? [])];
  expect(evidence).toHaveLength(3);
  const bench = run?.querySelector('.workbench');
  const fullHeight = bench?.getBoundingClientRect().height;
  for (const [index, step] of steps.entries()) {
    step.click();
    expect(run?.dataset.current).toBe(String(index));
    expect(step.getAttribute('aria-pressed')).toBe('true');
    expect(run?.querySelector(`[data-background-item="${index}"]`)?.checkVisibility()).toBe(true);
    expect(bench?.getBoundingClientRect().height).toBe(fullHeight);
    expect(evidence.every((card) => card.checkVisibility())).toBe(true);
  }
  expect(await commands.takeErrors()).toEqual([]);
});

test('journey controls keep keyboard focus when Next, Previous, or Replay disappears', async () => {
  const { document } = await openSite('/', { reducedMotion: true });
  const journey = document.querySelector('[data-example-journey]');
  const steps = [...(journey?.querySelectorAll<HTMLButtonElement>('[data-journey-step]') ?? [])];
  const next = journey?.querySelector<HTMLButtonElement>('[data-journey-next]');
  const previous = journey?.querySelector<HTMLButtonElement>('[data-journey-prev]');
  const replay = journey?.querySelector<HTMLButtonElement>('[data-journey-replay]');
  steps.at(-2)?.click();
  next?.focus();
  next?.click();
  expect(document.activeElement).not.toBe(document.body);
  expect((document.activeElement as HTMLElement).checkVisibility()).toBe(true);
  replay?.focus();
  replay?.click();
  expect(document.activeElement).not.toBe(document.body);
  expect((document.activeElement as HTMLElement).checkVisibility()).toBe(true);
  next?.click();
  previous?.focus();
  previous?.click();
  expect(document.activeElement).not.toBe(document.body);
  expect(document.activeElement).not.toBe(previous);
});

test('replaying background work starts playback while its button keeps keyboard focus', async () => {
  const { document } = await openSite('/features/ai/');
  const run = document.querySelector<HTMLElement>('[data-ai-background]');
  const replay = run?.querySelector<HTMLButtonElement>('[data-background-replay]');
  if (!run || !replay) throw new Error('Missing review replay');
  run.scrollIntoView({ block: 'start' });
  await expect.poll(() => run.dataset.playing).toBe('true');
  const step = run.querySelector<HTMLButtonElement>('[data-background-step="4"]');
  step?.focus();
  step?.click();
  replay.focus();
  replay.click();
  expect(document.activeElement).toBe(replay);
  expect(run.dataset.current).toBe('0');
  expect(run.dataset.playing).toBe('true');
  await expect.poll(() => run.dataset.current).toBe('1');
  expect(await commands.takeErrors()).toEqual([]);
});
