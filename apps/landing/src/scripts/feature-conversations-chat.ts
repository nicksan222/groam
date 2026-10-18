import {
  type ReactionKind,
  chatEvents,
  conversationsCopy,
  people,
  reactionLabels,
  startingEvents
} from '@/content/feature-conversations';
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
  let cursor = startingEvents;
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

  // Animates every message from where it was to where it is, so growth never jumps.
  const flip = (mutate: () => void) => {
    const before = new Map<Element, number>();
    for (const el of stream.children) before.set(el, el.getBoundingClientRect().top);
    mutate();
    for (const el of stream.children) {
      const was = before.get(el);
      if (was === undefined) continue;
      const delta = was - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: ms(520),
        easing: ease
      });
    }
  };

  const pop = (el: Element | null) =>
    el?.animate(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(1.12)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: ms(480), easing: ease }
    );

  const find = (id: string) => stream.querySelector<HTMLElement>(`[data-id="${id}"]`);

  const describe = (chip: HTMLElement, kind: ReactionKind, names: string) => {
    chip.title = names;
    chip.setAttribute('aria-label', `${names} reacted with ${reactionLabels[kind]}`);
  };

  const addReaction = (msg: HTMLElement, kind: ReactionKind, name: string, mine = false) => {
    const box = msg.querySelector<HTMLElement>('[data-reactions]');
    if (!box) return;
    const chip = box.querySelector<HTMLElement>(`.fc-chip[data-emoji="${kind}"]`);
    if (!chip) {
      box.insertAdjacentHTML('beforeend', chipHtml(kind, 1, name, mine));
      pop(box.lastElementChild);
      return;
    }
    const count = Number(chip.dataset.count) + 1;
    chip.dataset.count = String(count);
    describe(chip, kind, `${chip.title}, ${name}`);
    if (mine) chip.dataset.mine = '';
    const n = chip.querySelector('.fc-n');
    if (n) n.textContent = String(count);
    pop(chip);
  };

  const removeReaction = (msg: HTMLElement, kind: ReactionKind) => {
    const chip = msg.querySelector<HTMLElement>(`.fc-chip[data-emoji="${kind}"]`);
    if (!chip) return;
    const count = Number(chip.dataset.count) - 1;
    if (count <= 0) return chip.remove();
    chip.dataset.count = String(count);
    chip.removeAttribute('data-mine');
    const names = chip.title
      .split(', ')
      .filter((name) => name !== 'You')
      .join(', ');
    describe(chip, kind, names);
    const n = chip.querySelector('.fc-n');
    if (n) n.textContent = String(count);
  };

  const addReply = (msg: HTMLElement, html: string) => {
    const inner = msg.querySelector('[data-replies]');
    const button = msg.querySelector<HTMLButtonElement>('[data-thread]');
    if (!inner || !button) return;
    inner.insertAdjacentHTML('beforeend', html);
    const count = Number(msg.dataset.replies) + 1;
    msg.dataset.replies = String(count);
    button.textContent = `${count} ${count === 1 ? 'reply' : 'replies'}`;
    button.hidden = false;
    inner.lastElementChild?.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
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
        const room = () =>
          [...stream.children].reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
        while (stream.children.length > 1 && room() > stream.clientHeight - 20)
          stream.firstElementChild?.remove();
      });
      stream.lastElementChild?.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: ms(560), easing: ease }
      );
      autoRef = event.ref;
      paint();
      return;
    }
    const target = find(event.to);
    if (!target) return advance();
    flip(() => {
      if (event.kind === 'reply') addReply(target, replyHtml(event.who, event.text));
      else addReaction(target, event.emoji, people[event.who].name);
    });
    autoRef = target.dataset.ref ?? null;
    paint();
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
    const running = !reduced && onScreen && !paused && document.visibilityState === 'visible';
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

  if (!reduced) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
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
