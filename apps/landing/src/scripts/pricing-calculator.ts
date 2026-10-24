import { resultCopy } from '@/content/pricing';
import { translateText } from '@/i18n/runtime';

const avatarClasses = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'];
const letters = 'JPSLNARTEKDOMCBHGFIVWYJPSLNART';
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
const heightEase = 'cubic-bezier(0.65, 0, 0.35, 1)';
/** Attributes the tests and the page read; a fading ghost must not carry them. */
const hooks = ['data-total', 'data-rest', 'data-value', 'data-figure'];

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const initialFor = (index: number) => letters[index % letters.length] ?? 'J';

const ghosts = new WeakMap<HTMLElement, HTMLElement>();

/** Sets text at once, clearing any fade or ghost, for continuous input such as a drag or a held key. */
function setNow(el: HTMLElement, next: string) {
  ghosts.get(el)?.remove();
  for (const running of el.getAnimations()) running.cancel();
  el.textContent = next;
}

/**
 * Swaps text in two calm beats: the old words fade up and out as a ghost beside the element
 * (inside its own parent, so it keeps its styles), then the new words fade up and in. Never both at once.
 */
function crossfade(el: HTMLElement, next: string) {
  if (el.textContent === next) return;
  const host = el.parentElement;
  ghosts.get(el)?.remove();
  for (const running of el.getAnimations()) running.cancel();
  if (reduced() || !host) {
    el.textContent = next;
    return;
  }
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const current = Number(getComputedStyle(el).opacity);
  const ghost = el.cloneNode(true) as HTMLElement;
  for (const name of hooks) ghost.removeAttribute(name);
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'absolute',
    margin: '0',
    pointerEvents: 'none',
    left: `${el.offsetLeft}px`,
    top: `${el.offsetTop}px`,
    width: `${el.offsetWidth + 1}px`
  });
  el.after(ghost);
  ghosts.set(el, ghost);
  el.textContent = next;
  const out = ghost.animate(
    [
      { opacity: current, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-5px)' }
    ],
    { duration: 160, easing: ease, fill: 'forwards' }
  );
  out.onfinish = () => ghost.remove();
  el.animate(
    [
      { opacity: 0, transform: 'translateY(5px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    { duration: 340, delay: 140, easing: ease, fill: 'backwards' }
  );
}

let lift: Animation | undefined;

/** The strip stays opaque. It rises a little and presses flush; a lift already running is left to finish. */
function press(figure: HTMLElement) {
  if (reduced() || lift?.playState === 'running') return;
  lift = figure.animate(
    [
      { transform: 'none', boxShadow: '0 0 0 0 transparent', offset: 0 },
      { transform: 'translateY(-8px) rotate(-0.8deg)', boxShadow: 'var(--lift)', offset: 0.3 },
      { transform: 'none', boxShadow: '0 0 0 0 transparent', offset: 1 }
    ],
    { duration: 900, easing: 'ease-in-out' }
  );
}

let figureTimer = 0;

/** The figure's digits swap at the top of the lift: fade out, change, fade in. Always lands on the latest value. */
function swapFigure(text: HTMLElement, next: string) {
  window.clearTimeout(figureTimer);
  if (reduced()) {
    text.textContent = next;
    return;
  }
  if (text.textContent === next && !text.getAnimations().length) return;
  for (const running of text.getAnimations()) running.cancel();
  if (text.textContent === next) return;
  const out = text.animate([{ opacity: Number(getComputedStyle(text).opacity) }, { opacity: 0 }], {
    duration: 120,
    fill: 'forwards'
  });
  figureTimer = window.setTimeout(() => {
    out.cancel();
    text.textContent = next;
    text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: ease });
  }, 120);
}

/** Wires the control, the pasted total, the live sentence, and the roster where each traveler's €1 can be covered by you. */
export function initPricingCalculator(root: HTMLElement): void {
  const invitedInput = root.querySelector<HTMLInputElement>('[data-input="invited"]');
  const figure = root.querySelector<HTMLElement>('[data-figure]');
  const figureText = figure?.querySelector<HTMLElement>('.fig-text');
  const roster = root.querySelector<HTMLElement>('[data-roster]');
  const total = root.querySelector<HTMLElement>('[data-total]');
  const rest = root.querySelector<HTMLElement>('[data-rest]');
  const invitedOut = root.querySelector<HTMLElement>('[data-value="invited"]');
  if (!invitedInput || !figure || !figureText || !roster || !total || !rest || !invitedOut) return;

  const people: HTMLLIElement[] = [];
  /** Indexes of travelers whose €1 the organizer covers. */
  const covering = new Set<number>();
  let heightTimer = 0;
  let removeTimer = 0;
  let lastRenderAt = 0;
  let lastShown = Number(invitedInput.value);

  /** Animates the roster's height between its old and new size; clipped while it moves. */
  const flip = (mutate: () => void) => {
    const from = roster.getBoundingClientRect().height;
    mutate();
    if (reduced()) return;
    roster.style.transition = 'none';
    roster.style.height = 'auto';
    const to = roster.getBoundingClientRect().height;
    if (Math.abs(to - from) < 1) {
      roster.style.height = '';
      return;
    }
    const ms = Math.round(Math.min(1100, 400 + Math.abs(to - from) * 0.5));
    roster.style.height = `${from}px`;
    roster.style.overflow = 'clip';
    void roster.offsetHeight;
    roster.style.transition = `height ${ms}ms ${heightEase}`;
    roster.style.height = `${to}px`;
    window.clearTimeout(heightTimer);
    heightTimer = window.setTimeout(() => {
      roster.style.transition = '';
      roster.style.height = '';
      roster.style.overflow = '';
    }, ms + 40);
  };

  const buildPerson = (index: number, delay: number) => {
    const li = document.createElement('li');
    li.className = 'person paid';
    if (delay) li.style.setProperty('--d', `${delay}ms`);
    const avatar = document.createElement('span');
    avatar.className = `avatar big ${avatarClasses[index % avatarClasses.length]}`;
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initialFor(index);
    const pay = document.createElement('button');
    pay.type = 'button';
    pay.className = 'pay';
    pay.setAttribute('aria-pressed', 'false');
    pay.append(translateText('I’ll pay'));
    const hidden = document.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = ` ${translateText('for traveler {count}', { count: index + 1 })}`;
    pay.append(hidden);
    const status = document.createElement('span');
    status.className = 'status';
    status.setAttribute('aria-hidden', 'true');
    status.textContent = translateText('Pays own €1');
    pay.addEventListener('click', () => {
      const on = !covering.has(index);
      if (on) covering.add(index);
      else covering.delete(index);
      pay.setAttribute('aria-pressed', String(on));
      crossfade(status, on ? translateText('You pay €1') : translateText('Pays own €1'));
      render();
    });
    li.append(avatar, pay, status);
    return li;
  };

  const addPerson = (index: number, delay: number) => {
    const li = buildPerson(index, delay);
    const firstLeaving = roster.querySelector('.person.leaving');
    roster.insertBefore(li, firstLeaving);
    people.push(li);
  };

  /** Leaving travelers fade where they stand first; only then does the roster close up. */
  const removePeople = (count: number, step: number) => {
    const gone = people.splice(people.length - count, count).reverse();
    for (const k of gone.keys()) covering.delete(people.length + gone.length - 1 - k);
    if (reduced()) {
      for (const li of gone) li.remove();
      return;
    }
    for (const [k, li] of gone.entries()) {
      li.style.setProperty('--d', `${k * step}ms`);
      li.classList.add('leaving');
    }
    window.clearTimeout(removeTimer);
    removeTimer = window.setTimeout(
      () => {
        flip(() => {
          for (const li of roster.querySelectorAll('.person.leaving')) li.remove();
        });
      },
      400 + count * step
    );
  };

  const syncSteppers = () => {
    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
      const next = Number(invitedInput.value) + Number(btn.dataset.dir);
      const blocked = next < Number(invitedInput.min) || next > Number(invitedInput.max);
      if (blocked) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
    }
  };

  const pruneStrays = () => {
    const tracked = new Set<Element>(people);
    for (const li of roster.querySelectorAll('.person:not(.organizer):not(.leaving)')) {
      if (!tracked.has(li)) li.remove();
    }
  };

  /** Brings the roster to `invited` travelers; big jumps stagger within a short, capped window. */
  const syncRoster = (invited: number, first: boolean) => {
    if (first) {
      for (const li of roster.querySelectorAll('.person:not(.organizer)')) li.remove();
      for (let i = 0; i < invited; i += 1) addPerson(i, 0);
      for (const li of people) li.style.animation = 'none';
      return;
    }
    if (people.length === invited) return;
    const step = Math.min(30, Math.floor(260 / Math.abs(invited - people.length)));
    flip(() => {
      let k = 0;
      while (people.length < invited) addPerson(people.length, k++ * step);
    });
    if (people.length > invited) removePeople(people.length - invited, step);
  };

  /** `continuous` is set only by the slider's input stream (drag or held key). */
  const render = (first = false, continuous = false) => {
    const invited = Number(invitedInput.value);
    invitedInput.setAttribute(
      'aria-valuetext',
      invited === 1
        ? translateText('{count} traveler invited', { count: invited })
        : translateText('{count} travelers invited', { count: invited })
    );
    syncSteppers();
    syncRoster(invited, first);

    const source = resultCopy(invited, covering.size);
    const copy = { total: translateText(source.total), rest: translateText(source.rest) };
    const now = performance.now();
    const burst = continuous && now - lastRenderAt < 150;
    lastRenderAt = now;
    if (first || burst) {
      window.clearTimeout(figureTimer);
      setNow(invitedOut, String(invited));
      setNow(figureText, `€${invited}`);
      setNow(total, copy.total);
      setNow(rest, copy.rest);
    } else {
      crossfade(invitedOut, String(invited));
      swapFigure(figureText, `€${invited}`);
      crossfade(total, copy.total);
      crossfade(rest, copy.rest);
    }
    if (!first && lastShown !== invited) press(figure);
    lastShown = invited;
    pruneStrays();
  };

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      invitedInput.value = String(Number(invitedInput.value) + Number(btn.dataset.dir));
      render();
    });
  }
  invitedInput.addEventListener('input', () => render(false, true));
  render(true);
}
