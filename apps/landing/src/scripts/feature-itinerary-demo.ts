import { translateText } from '@/i18n/runtime';
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
const days = ['fri', 'sat', 'sun'] as const;
type Day = (typeof days)[number];
type Variant = 'before' | 'after';

const gapMs = 1300;
const dwellMs = 1100;

const toMinutes = (time: string) => {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
};
const clockText = (minutes: number) => {
  const total = Math.floor(minutes + 1e-9);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

type Model = {
  root: HTMLElement;
  stage: HTMLElement;
  cursor: HTMLElement;
  handle: HTMLButtonElement;
  clock: HTMLElement;
  panels: HTMLOListElement[];
  reduce: boolean;
  day: Day;
  variant: Variant;
  u: number;
  starts: number[];
  mins: number[];
};

const slotsOf = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLLIElement>('.slot')];
const panelId = (m: Model) => (m.day === 'sat' ? `sat-${m.variant}` : m.day);
const activePanel = (m: Model) =>
  m.panels.find((panel) => panel.dataset.panel === panelId(m)) ?? (m.panels[0] as HTMLOListElement);
const maxU = (m: Model) => Math.max(m.starts.length - 1, 1);

const lerpAt = (values: number[], at: number) => {
  const i = Math.min(Math.max(Math.floor(at), 0), values.length - 2);
  const t = Math.min(Math.max(at - i, 0), 1);
  const a = values[i] ?? 0;
  return a + ((values[i + 1] ?? a) - a) * t;
};

/** Layout coordinates stay stable while the panel or its rows are animating. */
function topWithin(element: HTMLElement, ancestor: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

function measure(m: Model): void {
  const slots = slotsOf(activePanel(m));
  m.starts = slots.map((slot) => topWithin(slot, m.stage) - m.cursor.offsetTop);
  m.mins = slots.map((slot) =>
    toMinutes(slot.querySelector('[data-slot-time]')?.textContent ?? '0:0')
  );
}

function place(m: Model): void {
  if (m.starts.length < 2) return;
  m.u = Math.min(Math.max(m.u, 0), maxU(m));
  m.cursor.style.transform = `translateY(${lerpAt(m.starts, m.u)}px)`;
  const text = clockText(lerpAt(m.mins, m.u));
  m.clock.textContent = text;
  const slots = slotsOf(activePanel(m));
  const index = Math.min(Math.floor(m.u), slots.length - 1);
  slots.forEach((slot, i) => slot.classList.toggle('is-now', i === index));
  m.handle.setAttribute('aria-valuenow', String(Math.round((m.u / maxU(m)) * 100)));
  const label = slots[index]?.querySelector('[data-label]')?.textContent ?? '';
  m.handle.setAttribute('aria-valuetext', `${text}, ${label}`);
}

function uFromY(m: Model, y: number): number {
  const last = m.starts.length - 2;
  for (let i = 0; i <= last; i++) {
    const a = m.starts[i] ?? 0;
    const b = m.starts[i + 1] ?? a;
    if (y <= b || i === last) return i + Math.min(Math.max((y - a) / (b - a || 1), 0), 1);
  }
  return 0;
}

function slideIn(m: Model): void {
  if (m.reduce) return;
  slotsOf(activePanel(m)).forEach((slot, index) => {
    const timing = {
      duration: 750,
      delay: 220 + index * 90,
      easing: ease,
      fill: 'backwards'
    } as const;
    slot.querySelector('.act')?.animate(
      [
        { opacity: 0, transform: 'translateX(14px)' },
        { opacity: 1, transform: 'none' }
      ],
      timing
    );
    slot
      .querySelector('[data-slot-time]')
      ?.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: 500 });
    // The move arrows arrive with their row. On phones they stay hidden until a row opens.
    if (!matchMedia('(max-width: 480px)').matches)
      slot
        .querySelector('.mv')
        ?.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: 500 });
  });
}

function refreshMoves(m: Model): void {
  for (const panel of m.panels) {
    const slots = slotsOf(panel);
    slots.forEach((slot, index) => {
      const label = slot.querySelector('[data-label]')?.textContent ?? '';
      for (const button of slot.querySelectorAll<HTMLButtonElement>('[data-move]')) {
        const dir = Number(button.dataset.move);
        button.setAttribute(
          'aria-label',
          translateText(dir < 0 ? 'Move {label} up' : 'Move {label} down', { label })
        );
        button.setAttribute(
          'aria-disabled',
          String(index + dir < 0 || index + dir >= slots.length)
        );
      }
    });
  }
}

function show(m: Model, day: Day, variant: Variant = m.variant): void {
  m.day = day;
  m.variant = variant;
  m.root.dataset.day = day;
  m.root.dataset.variant = variant;
  const active = activePanel(m);
  for (const panel of m.panels) panel.dataset.active = String(panel === active);
  for (const button of m.root.querySelectorAll<HTMLButtonElement>('[data-day-btn]')) {
    button.setAttribute('aria-pressed', String(button.dataset.dayBtn === day));
  }
  for (const button of m.root.querySelectorAll<HTMLButtonElement>('[data-ba-btn]')) {
    button.setAttribute('aria-pressed', String(button.dataset.baBtn === variant));
  }
  refreshMoves(m);
  measure(m);
  m.u = 0;
  place(m);
  if (!m.reduce) resetCursor(m);
  slideIn(m);
}

/** Start the new day atomically; only opacity eases, never a delayed position reset. */
function resetCursor(m: Model): void {
  for (const running of m.cursor.getAnimations()) running.cancel();
  m.cursor.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 400,
    easing: ease
  });
}

const pendingSummary = new WeakMap<Element, string>();
function refreshSummary(panel: HTMLElement, animate: boolean): void {
  const slots = slotsOf(panel);
  const last = slots.at(-1);
  const sum = panel.querySelector('.sum');
  if (!last || !sum) return;
  const time = last.querySelector('[data-slot-time]')?.textContent ?? '';
  const title = last.querySelector('[data-label]')?.textContent ?? '';
  const text = translateText('{count} stops · ends {time} with {title}', {
    count: slots.length,
    time,
    title
  });
  if (!animate) {
    sum.textContent = text;
    return;
  }
  if (pendingSummary.has(sum)) {
    pendingSummary.set(sum, text);
    return;
  }
  pendingSummary.set(sum, text);
  const out = sum.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 120,
    easing: ease,
    fill: 'forwards'
  });
  const finish = () => {
    sum.textContent = pendingSummary.get(sum) ?? text;
    pendingSummary.delete(sum);
    out.cancel();
    sum.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: ease });
  };
  void out.finished.then(finish).catch(finish);
}

/** Glides a row from its old place; the row that was asked to move rides above its neighbour. */
function glideRow(item: HTMLElement, delta: number, lead: boolean): void {
  item.style.position = 'relative';
  item.style.zIndex = lead ? '2' : '1';
  const glide = item.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
    duration: 600,
    easing: ease
  });
  const rest = () => {
    item.style.position = '';
    item.style.zIndex = '';
  };
  void glide.finished.then(rest, rest);
}

/** Swaps a slot with its neighbour; the time slots stay put and the activities glide through them. */
function move(m: Model, slot: HTMLLIElement, dir: number, button: HTMLButtonElement): void {
  const panel = slot.parentElement as HTMLElement;
  const slots = slotsOf(panel);
  const other = slots[slots.indexOf(slot) + dir];
  if (!other) return;
  const times = slots.map((item) => item.querySelector('[data-slot-time]')?.textContent ?? '');
  const before = new Map(slots.map((item) => [item, item.getBoundingClientRect().top]));
  if (dir < 0) other.before(slot);
  else other.after(slot);
  const after = slotsOf(panel);
  after.forEach((item, i) => {
    const time = item.querySelector('[data-slot-time]');
    if (time) time.textContent = times[i] ?? '';
  });
  if (!m.reduce) {
    for (const item of slots) {
      const delta = (before.get(item) ?? 0) - item.getBoundingClientRect().top;
      if (!delta) continue;
      glideRow(item, delta, item === slot);
    }
  }
  refreshMoves(m);
  refreshSummary(panel, !m.reduce);
  measure(m);
  place(m);
  button.focus();
  const note = m.root.querySelector('[data-announce]');
  const label = slot.querySelector('[data-label]')?.textContent ?? '';
  if (note)
    note.textContent = translateText(
      dir < 0 ? '{label} moved up to {time}' : '{label} moved down to {time}',
      { label, time: times[after.indexOf(slot)] ?? '' }
    );
}

const keySteps: Record<string, number> = {
  ArrowDown: 0.25,
  ArrowRight: 0.25,
  ArrowUp: -0.25,
  ArrowLeft: -0.25,
  PageDown: 1,
  PageUp: -1
};

function keyTarget(m: Model, key: string): number | undefined {
  if (key === 'Home') return 0;
  if (key === 'End') return maxU(m);
  const step = keySteps[key];
  return step === undefined ? undefined : m.u + step;
}

function wireControls(
  m: Model,
  onTakeOver: () => void,
  onDragChange: (dragging: boolean) => void,
  resetDwell: () => void
) {
  for (const button of m.root.querySelectorAll<HTMLButtonElement>('[data-day-btn]')) {
    button.addEventListener('click', () => {
      resetDwell();
      show(m, button.dataset.dayBtn as Day);
    });
  }
  for (const button of m.root.querySelectorAll<HTMLButtonElement>('[data-ba-btn]')) {
    button.addEventListener('click', () => {
      resetDwell();
      show(m, 'sat', button.dataset.baBtn as Variant);
    });
  }
  m.stage.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('[data-move]');
    if (!button) target.closest('.slot')?.classList.toggle('is-open');
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    move(m, button.closest('.slot') as HTMLLIElement, Number(button.dataset.move), button);
  });
  m.handle.addEventListener('pointerdown', (event) => {
    m.handle.setPointerCapture(event.pointerId);
    onDragChange(true);
  });
  m.handle.addEventListener('pointermove', (event) => {
    if (!m.handle.hasPointerCapture(event.pointerId)) return;
    m.u = uFromY(m, event.clientY - m.stage.getBoundingClientRect().top - m.cursor.offsetTop);
    place(m);
  });
  const end = () => onDragChange(false);
  m.handle.addEventListener('pointerup', end);
  m.handle.addEventListener('pointercancel', end);
  m.handle.addEventListener('keydown', (event) => {
    const next = keyTarget(m, event.key);
    if (next === undefined) return;
    event.preventDefault();
    onTakeOver();
    m.u = next;
    place(m);
  });
}

/**
 * The itinerary demo. A time cursor sweeps each day, rows light up as it passes, and after a short
 * dwell the next day slides its activities into their time slots, forever. Visitors can switch days,
 * flip Saturday between Before and After, drag or arrow-key the cursor, and reorder activities with
 * the move buttons. The loop stops under reduced motion, off screen, in a hidden tab, and while paused.
 */
export function playItinerary(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const cursor = root.querySelector<HTMLElement>('[data-cursor]');
  const handle = root.querySelector<HTMLButtonElement>('[data-handle]');
  const clock = root.querySelector<HTMLElement>('[data-clock]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!stage || !cursor || !handle || !clock) return;
  const m: Model = {
    root,
    stage,
    cursor,
    handle,
    clock,
    panels: [...root.querySelectorAll<HTMLOListElement>('[data-panel]')],
    reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
    day: root.dataset.day as Day,
    variant: root.dataset.variant as Variant,
    u: 0,
    starts: [],
    mins: []
  };

  let paused = false;
  let dragging = false;
  let focused = false;
  let onScreen = false;
  let raf = 0;
  let last = 0;
  let dwell = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(now - last, 80);
    last = now;
    if (dwell > 0) {
      dwell -= dt;
      if (dwell <= 0 && m.u >= maxU(m) - 0.001) {
        show(m, days[(days.indexOf(m.day) + 1) % days.length] as Day);
        dwell = 500;
      }
      return;
    }
    m.u += dt / gapMs;
    if (m.u >= maxU(m)) {
      m.u = maxU(m);
      dwell = dwellMs;
    }
    place(m);
  };

  const sync = () => {
    const running =
      onScreen &&
      !paused &&
      !dragging &&
      !focused &&
      !m.reduce &&
      document.visibilityState === 'visible';
    root.dataset.running = String(running);
    cancelAnimationFrame(raf);
    raf = 0;
    if (!running) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const setPaused = (value: boolean) => {
    paused = value;
    toggle?.setAttribute('aria-pressed', String(paused));
    const label = toggle?.querySelector('.play-label');
    if (label) label.textContent = translateText(paused ? 'Play' : 'Pause');
    sync();
  };

  wireControls(
    m,
    () => !paused && !m.reduce && setPaused(true),
    (value) => {
      dragging = value;
      if (!value) dwell = m.u >= maxU(m) - 0.001 ? dwellMs : 0;
      sync();
    },
    () => {
      dwell = 0;
    }
  );

  refreshMoves(m);
  const fit = () => {
    measure(m);
    place(m);
  };
  fit();
  new ResizeObserver(fit).observe(stage);

  if (m.reduce) return;
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => setPaused(!paused));
  }
  root.addEventListener('focusin', (event) => {
    // The pause control itself never holds the loop.
    focused = !(event.target as Element).closest('[data-toggle]');
    sync();
  });
  root.addEventListener('focusout', (event) => {
    if (root.contains(event.relatedTarget as Node | null)) return;
    focused = false;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    sync();
  }).observe(root);
}
