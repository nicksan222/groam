import { translateText } from '@/i18n/runtime';

const motionOptions: KeyframeAnimationOptions = {
  duration: 480,
  easing: 'cubic-bezier(0.16,1,0.3,1)'
};

function keyboardIndex(event: KeyboardEvent, index: number, last: number) {
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return last;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') return Math.min(last, index + 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') return Math.max(0, index - 1);
  return null;
}

export function setupAiJourney(root: HTMLElement) {
  const controls = [...root.querySelectorAll<HTMLButtonElement>('[data-journey-step]')];
  const messages = [...root.querySelectorAll<HTMLElement>('[data-journey-message]')];
  const transcript = root.querySelector<HTMLElement>('[data-journey-transcript]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-journey-toggle]');
  const position = root.querySelector<HTMLElement>('[data-journey-position]');
  const state = root.querySelector<HTMLElement>('[data-journey-state]');
  const stateText = state?.querySelector<HTMLElement>('span');
  const idea = root.querySelector<HTMLElement>('[data-journey-idea]');
  const ideaStatus = idea?.querySelector<HTMLElement>('[data-idea-status]');
  const ideaRows = idea?.querySelector<HTMLOListElement>('[data-idea-rows]');
  const ideaRemoves = idea?.querySelector<HTMLElement>('[data-idea-removes]');
  const ideaEmpty = idea?.querySelector<HTMLElement>('[data-idea-empty]');
  const ideaNote = idea?.querySelector<HTMLElement>('[data-idea-note]');
  const templates = [...root.querySelectorAll<HTMLTemplateElement>('[data-journey-idea-template]')];
  const planBefore = root.querySelector<HTMLOListElement>('[data-plan-version="before"]');
  const planAfter = root.querySelector<HTMLOListElement>('[data-plan-version="after"]');
  const planCaption = root.querySelector<HTMLElement>('[data-plan-caption]');
  const planChip = root.querySelector<HTMLElement>('[data-plan-chip]');
  if (!controls.length || controls.length !== messages.length || !transcript || !ideaRows) return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const last = controls.length - 1;
  let reduced = preference.matches;
  let current = reduced ? last : 0;
  let paused = false;
  let onScreen = false;
  let focusHeld = false;
  let timer = 0;
  let revision = 0;

  const cancelTimer = () => {
    window.clearTimeout(timer);
    timer = 0;
  };
  const canPlay = () => !reduced && !paused && !focusHeld && onScreen && !document.hidden;
  const hasHeldFocus = () => {
    const active = document.activeElement;
    return (
      active instanceof Element && root.contains(active) && !active.closest('[data-journey-toggle]')
    );
  };
  const syncPlayback = () => {
    root.dataset.playing = String(canPlay());
    if (!canPlay()) cancelTimer();
  };
  const schedule = (delay = 5000) => {
    cancelTimer();
    syncPlayback();
    if (!canPlay()) return;
    timer = window.setTimeout(() => select(current === last ? 0 : current + 1, true), delay);
  };

  const updateIdea = (index: number, animate: boolean, run: number) => {
    const control = controls[index];
    const template = templates[index];
    if (!control || !template) return;
    ideaStatus?.replaceChildren(control.dataset.ideaStatus ?? translateText('Draft'));
    ideaNote?.replaceChildren(control.dataset.ideaNote ?? '');
    const replaceRows = () => {
      if (run !== revision) return;
      ideaRows.replaceChildren(template.content.cloneNode(true));
      const hasRows = ideaRows.childElementCount > 0;
      ideaRows.hidden = !hasRows;
      if (ideaRemoves) ideaRemoves.hidden = !hasRows;
      if (ideaEmpty) ideaEmpty.hidden = hasRows;
      if (animate) {
        ideaRows.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'none' }
          ],
          motionOptions
        );
      }
    };
    if (!animate) {
      replaceRows();
      return;
    }
    const out = ideaRows.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-5px)' }
      ],
      { ...motionOptions, duration: 180 }
    );
    void out.finished.then(replaceRows).catch(() => undefined);
  };

  const updateMessages = (next: number, animate: boolean, run: number) => {
    messages.forEach((message, index) => {
      if (index <= next) {
        const entering = message.hidden;
        message.hidden = false;
        message.toggleAttribute('data-current-message', index === next);
        if (animate && entering) {
          message.animate(
            [
              { opacity: 0, transform: 'translateY(14px) scale(.985)' },
              { opacity: 1, transform: 'none' }
            ],
            motionOptions
          );
        }
        return;
      }
      message.removeAttribute('data-current-message');
      if (!animate || message.hidden) {
        message.hidden = true;
        return;
      }
      const out = message.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(8px)' }
        ],
        { ...motionOptions, duration: 220 }
      );
      void out.finished
        .then(() => {
          if (run === revision) message.hidden = true;
        })
        .catch(() => undefined);
    });
  };

  const updateSelection = (selected: HTMLButtonElement | undefined, focus: boolean) => {
    controls.forEach((control, index) => {
      const active = index === current;
      control.setAttribute('aria-pressed', String(active));
      control.tabIndex = active ? 0 : -1;
    });
    if (!selected) return;
    if (focus) selected.focus();
    const label = selected.textContent?.trim().replace(/^\d+/, '') ?? '';
    position?.replaceChildren(`${String(current + 1).padStart(2, '0')} · ${label}`);
  };

  const updatePlan = (applied: boolean) => {
    state?.classList.toggle('applied', applied);
    stateText?.replaceChildren(
      translateText(applied ? 'Shared plan updated' : 'Shared plan unchanged')
    );
    idea?.classList.toggle('flush', applied);
    planChip?.classList.toggle('applied', applied);
    planChip?.replaceChildren(translateText(applied ? 'Applied' : 'Live'));
    planCaption?.replaceChildren(
      translateText(applied ? 'Sintra is now live' : 'Belém is still live')
    );
    planBefore?.classList.toggle('is-visible', !applied);
    planBefore?.setAttribute('aria-hidden', String(applied));
    planAfter?.classList.toggle('is-visible', applied);
    planAfter?.setAttribute('aria-hidden', String(!applied));
  };

  const select = (next: number, animate = false, announce = false, focus = false) => {
    revision += 1;
    root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    const normalized = Math.max(0, Math.min(last, next));
    const moving = animate && !reduced && normalized !== current;
    current = normalized;
    const run = revision;
    const applied = current === last;
    const selected = controls[current];

    root.dataset.current = String(current);
    root.dataset.aiState = applied ? 'applied' : 'unchanged';
    updateSelection(selected, focus);
    updatePlan(applied);
    updateMessages(current, moving, run);
    updateIdea(current, moving, run);
    transcript.setAttribute('aria-live', announce || paused || reduced ? 'polite' : 'off');
    requestAnimationFrame(() => {
      transcript.scrollTo({ top: transcript.scrollHeight, behavior: moving ? 'smooth' : 'auto' });
    });
    schedule(moving ? 5700 : 5000);
  };

  controls.forEach((control, index) => {
    control.addEventListener('click', () => {
      paused = true;
      root.toggleAttribute('data-paused', true);
      toggle?.setAttribute('aria-pressed', 'true');
      toggle?.querySelector('.visually-hidden')?.replaceChildren(translateText('Play the example'));
      select(index, true, true);
    });
    control.addEventListener('keydown', (event) => {
      const next = keyboardIndex(event, index, last);
      if (next === null) return;
      event.preventDefault();
      select(next, true, true, true);
    });
  });

  root.addEventListener('focusin', () => {
    focusHeld = hasHeldFocus();
    select(current, false);
  });
  root.addEventListener('focusout', () => {
    queueMicrotask(() => {
      focusHeld = hasHeldFocus();
      schedule(2400);
    });
  });

  if (toggle) {
    toggle.hidden = reduced;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.toggleAttribute('data-paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle
        .querySelector('.visually-hidden')
        ?.replaceChildren(translateText(paused ? 'Play the example' : 'Pause the example'));
      select(current, false);
      if (!paused) schedule(1000);
    });
  }

  preference.addEventListener('change', (event) => {
    reduced = event.matches;
    if (toggle) toggle.hidden = reduced;
    select(reduced ? last : current, false);
    schedule(1000);
  });
  document.addEventListener('visibilitychange', () => {
    select(current, false);
    if (!document.hidden) schedule(1000);
  });
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (!onScreen) {
        select(current, false);
        return;
      }
      schedule(1800);
    },
    { threshold: 0.2 }
  ).observe(root);

  root.dataset.ready = '';
  select(current, false);
}
