import {
  type ReactionKind,
  chatEvents,
  conversationsCopy,
  people,
  reactionLabels,
  startingEvents,
  stillEvents
} from '@/content/feature-conversations';
import { translateText } from '@/i18n/runtime';
import {
  chipHtml,
  messageHtml,
  replyHtml,
  stamp,
  startingMessages
} from '@/scripts/feature-conversations-markup';

const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Plays the trip chat beside the Saturday itinerary: messages, replies, and reactions arrive and
 * a message lights the plan row it is about. After the last event the stream crossfades back to
 * its opening state. Steps are chained timeouts, so pausing stops everything. The viewer can
 * react and fold threads. No loop under reduced motion; controls still work.
 */
export function playTripChat(root: HTMLElement): void {
  const stream = root.querySelector<HTMLElement>('[data-stream]');
  const rows = [...root.querySelectorAll<HTMLElement>('[data-plan-ref]')];
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!stream || !toggle) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (n: number) => (reduced ? 0 : n);

  const messagesAtStart = () =>
    chatEvents.slice(0, startingEvents).filter((e) => e.kind === 'message').length;
  let cursor = reduced ? stillEvents : startingEvents;
  let sent = messagesAtStart();
  let phase: 'play' | 'fade' | 'reset' = 'play';
  let autoRef: string | null = stream.lastElementChild?.getAttribute('data-ref') ?? null;
  let hoverRef: string | null = null;
  let paused = false;
  let onScreen = false;
  let timer: number | undefined;

  const paint = () => {
    const hot = hoverRef ?? autoRef;
    for (const row of rows) row.classList.toggle('hot', row.dataset.planRef === hot);
  };

  const live = () =>
    [...stream.children].filter((el): el is HTMLElement => !el.classList.contains('is-leaving'));

  // Stream padding and gap, read once so fitting never clips a message mid-way.
  const fits = () => {
    const style = getComputedStyle(stream);
    const gap = Number.parseFloat(style.rowGap) || 0;
    const pad = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const items = live();
    const total =
      items.reduce((sum, el) => sum + el.offsetHeight, 0) + gap * Math.max(0, items.length - 1);
    return total + pad <= stream.clientHeight;
  };

  // While the demo runs the stream stays full: the oldest message crops under the fold strip and
  // is only dropped once it is entirely hidden behind it.
  const crop = !reduced;
  const fold = 28;
  const dropHidden = () => {
    const edge = stream.getBoundingClientRect().top + fold;
    while (live().length > 1) {
      const old = live()[0];
      if (!old || old.getAnimations().length > 0 || old.getBoundingClientRect().bottom > edge)
        break;
      old.remove();
    }
  };

  const settleStream = () => {
    for (const old of trim()) old.remove();
    if (crop) dropHidden();
  };
  const sweep = () => window.setTimeout(dropHidden, ms(700));

  // Drops the oldest messages until the rest fit whole.
  const trim = (): HTMLElement[] => {
    // While cropping, nothing is removed mid-move: messages that end up fully behind the fold
    // are swept once the layout has settled.
    if (crop) return [];
    const dropped: HTMLElement[] = [];
    while (live().length > 1 && !fits()) {
      const old = live()[0];
      if (!old) break;
      old.classList.add('is-leaving');
      dropped.push(old);
    }
    return dropped;
  };

  // Pins each dropped message where it stood, then lets it glide up and fade away.
  const releaseGone = (
    gone: Element[],
    before: Map<Element, number>,
    top: number,
    shift: number
  ) => {
    for (const el of gone) {
      const node = el as HTMLElement;
      node.style.top = `${(before.get(el) ?? 0) - top}px`;
      node.style.left = '16px';
      node.style.right = '16px';
      if (reduced) {
        node.remove();
        continue;
      }
      const fade = node.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: `translateY(${-shift}px)` }
        ],
        { duration: 420, easing: ease, fill: 'forwards' }
      );
      void fade.finished.then(() => node.remove()).catch(() => undefined);
    }
  };

  // Moves every message from where it was to where it is. Dropped messages are pinned where they
  // stood, then glide up and fade; a new message rises from below the clip.
  const flip = (mutate: () => HTMLElement | null) => {
    const top = stream.getBoundingClientRect().top;
    const before = new Map<Element, number>();
    for (const el of live()) before.set(el, el.getBoundingClientRect().top);
    const fresh = mutate();
    const gone = [...stream.children].filter((el) => el.classList.contains('is-leaving'));
    let shift = 0;
    for (const el of live()) {
      const was = before.get(el);
      if (was === undefined) continue;
      const delta = was - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      shift = Math.max(shift, delta);
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: ms(520),
        easing: ease
      });
    }
    releaseGone(gone, before, top, shift);
    if (fresh && shift > 0)
      fresh.animate(
        [
          { opacity: 0, transform: `translateY(${shift}px)` },
          { opacity: 0, transform: `translateY(${shift}px)`, offset: 0.25 },
          { opacity: 1, transform: 'none' }
        ],
        { duration: ms(560), easing: ease }
      );
  };

  const pop = (el: Element | null) =>
    el?.animate(
      [
        { transform: 'translateY(4px)', opacity: 0 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: ms(360), easing: ease }
    );

  const find = (id: string) => stream.querySelector<HTMLElement>(`[data-id="${id}"]`);

  const describe = (chip: HTMLElement, kind: ReactionKind, names: string) => {
    const shownNames = names
      .split(', ')
      .map((name) => translateText(name))
      .join(', ');
    chip.title = shownNames;
    chip.setAttribute(
      'aria-label',
      translateText('{names} reacted with {reaction}', {
        names: shownNames,
        reaction: translateText(reactionLabels[kind])
      })
    );
  };

  const addReaction = (msg: HTMLElement, kind: ReactionKind, name: string, mine = false) => {
    const box = msg.querySelector<HTMLElement>('[data-reactions]');
    if (!box) return;
    const chip = box.querySelector<HTMLElement>(`.fc-chip[data-emoji="${kind}"]`);
    if (!chip) {
      // The buttons after the new chip glide aside instead of snapping.
      const siblings = [...(msg.querySelectorAll<HTMLElement>('.fc-btn') ?? [])];
      const was = siblings.map((el) => el.getBoundingClientRect().left);
      box.insertAdjacentHTML('beforeend', chipHtml(kind, 1, name, mine));
      siblings.forEach((el, i) => {
        const dx = (was[i] ?? 0) - el.getBoundingClientRect().left;
        if (Math.abs(dx) < 1) return;
        el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], {
          duration: ms(420),
          easing: ease
        });
      });
      pop(box.lastElementChild);
      return;
    }
    for (const running of chip.getAnimations()) running.cancel();
    const previousCount = Number(chip.dataset.count);
    const count = previousCount + 1;
    chip.dataset.count = String(count);
    chip.removeAttribute('aria-hidden');
    describe(chip, kind, previousCount > 0 ? `${chip.title}, ${name}` : name);
    if (mine) chip.dataset.mine = '';
    const n = chip.querySelector('.fc-n');
    if (n) n.textContent = String(count);
    pop(chip);
  };

  const removeReaction = (msg: HTMLElement, kind: ReactionKind) => {
    const chip = msg.querySelector<HTMLElement>(`.fc-chip[data-emoji="${kind}"]`);
    if (!chip) return;
    const count = Number(chip.dataset.count) - 1;
    for (const running of chip.getAnimations()) running.cancel();
    if (count <= 0) {
      chip.dataset.count = '0';
      chip.setAttribute('aria-hidden', 'true');
      const siblings = [...msg.querySelectorAll<HTMLElement>('.fc-btn')];
      const before = siblings.map((item) => item.getBoundingClientRect().left);
      const out = chip.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-3px) scale(0.94)' }
        ],
        { duration: ms(180), easing: ease, fill: 'forwards' }
      );
      void out.finished
        .then(() => {
          if (chip.dataset.count !== '0') return;
          chip.remove();
          siblings.forEach((item, index) => {
            const dx = (before[index] ?? 0) - item.getBoundingClientRect().left;
            if (Math.abs(dx) < 1) return;
            item.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], {
              duration: ms(320),
              easing: ease
            });
          });
        })
        .catch(() => undefined);
      return;
    }
    chip.dataset.count = String(count);
    chip.removeAttribute('data-mine');
    const names = chip.title
      .split(', ')
      .filter((name) => name !== translateText('You'))
      .join(', ');
    describe(chip, kind, names);
    const n = chip.querySelector('.fc-n');
    if (n) n.textContent = String(count);
    pop(chip);
  };

  const addReply = (msg: HTMLElement, html: string) => {
    const inner = msg.querySelector('[data-replies]');
    const button = msg.querySelector<HTMLButtonElement>('[data-thread]');
    if (!inner || !button) return;
    inner.insertAdjacentHTML('beforeend', html);
    const count = Number(msg.dataset.replies) + 1;
    button.textContent = translateText(count === 1 ? '{count} reply' : '{count} replies', {
      count
    });
    const wasHidden = button.hidden;
    button.hidden = false;
    if (wasHidden)
      button.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(420), easing: ease });
    // The thread opens from zero height on the next frame, so the message grows smoothly.
    void msg.offsetHeight;
    msg.dataset.replies = String(count);
    inner.lastElementChild?.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: ms(520), easing: ease }
    );
  };

  const advance = () => {
    const event = chatEvents[cursor];
    cursor += 1;
    if (!event) return;
    if (event.kind === 'message') {
      flip(() => {
        stream.insertAdjacentHTML('beforeend', messageHtml({ ...event, time: stamp(sent++) }));
        const added = stream.lastElementChild as HTMLElement | null;
        trim();
        return added;
      });
      sweep();
      autoRef = event.ref;
      paint();
      return;
    }
    const target = find(event.to);
    if (!target) return advance();
    flip(() => {
      if (event.kind === 'reply') addReply(target, replyHtml(event.who, event.text));
      else addReaction(target, event.emoji, people[event.who].name);
      trim();
      return null;
    });
    autoRef = target.dataset.ref ?? null;
    paint();
    sweep();
  };

  // Returns how long to wait before the next step.
  const step = (): number => {
    if (phase === 'play' && cursor < chatEvents.length) {
      advance();
      return conversationsCopy.stepWait;
    }
    if (phase === 'play') {
      phase = 'fade';
      return conversationsCopy.stepWait;
    }
    if (phase === 'fade') {
      stream.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        easing: 'ease-in',
        fill: 'forwards'
      });
      phase = 'reset';
      return 220;
    }
    stream.innerHTML = startingMessages(chatEvents, startingEvents);
    settleStream();
    for (const animation of stream.getAnimations()) animation.cancel();
    stream.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: ease });
    cursor = startingEvents;
    sent = messagesAtStart();
    phase = 'play';
    autoRef = stream.lastElementChild?.getAttribute('data-ref') ?? null;
    paint();
    return conversationsCopy.stepWait;
  };

  const tick = () => {
    timer = window.setTimeout(tick, step());
  };

  const sync = () => {
    const held = root.matches(':has(:focus-visible:not([data-toggle]))');
    const running =
      !reduced && onScreen && !paused && !held && document.visibilityState === 'visible';
    if (running && timer === undefined) timer = window.setTimeout(tick, 600);
    if (!running && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    for (const animation of root.getAnimations({ subtree: true })) {
      if (paused) animation.pause();
      else if (animation.playState === 'paused') animation.play();
    }
  };

  if (crop) {
    root.classList.add('crop');
    stream.innerHTML = startingMessages(chatEvents, startingEvents);
  }
  settleStream();
  autoRef = stream.lastElementChild?.getAttribute('data-ref') ?? null;
  let lastWidth = stream.clientWidth;
  new ResizeObserver(() => {
    if (stream.clientWidth === lastWidth) return;
    lastWidth = stream.clientWidth;
    settleStream();
  }).observe(stream);

  const refOf = (target: EventTarget | null) =>
    (target instanceof Element ? target.closest<HTMLElement>('.fc-msg') : null)?.dataset.ref ??
    null;

  stream.addEventListener('pointerover', (event) => {
    hoverRef = refOf(event.target);
    paint();
  });
  stream.addEventListener('pointerleave', () => {
    hoverRef = null;
    paint();
  });
  stream.addEventListener('focusin', (event) => {
    hoverRef = refOf(event.target);
    paint();
  });
  stream.addEventListener('focusout', () => {
    hoverRef = null;
    paint();
  });

  stream.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const msg = event.target.closest<HTMLElement>('.fc-msg');
    if (!msg) return;
    const react = event.target.closest<HTMLButtonElement>('[data-react]');
    if (react) {
      const on = react.getAttribute('aria-pressed') !== 'true';
      react.setAttribute('aria-pressed', String(on));
      if (on) addReaction(msg, 'like', 'You', true);
      else removeReaction(msg, 'like');
      return;
    }
    const thread = event.target.closest<HTMLButtonElement>('[data-thread]');
    if (thread) {
      const open = thread.getAttribute('aria-expanded') !== 'true';
      thread.setAttribute('aria-expanded', String(open));
      msg.classList.toggle('folded', !open);
    }
  });

  root.addEventListener('focusin', sync);
  root.addEventListener('focusout', () => window.setTimeout(sync, 0));
  if (!reduced) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle
        .querySelector('.visually-hidden')
        ?.replaceChildren(translateText(paused ? 'Play the chat' : 'Pause the chat'));
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    }).observe(root);
  }
  paint();
}
