import { resultCopy } from '@/content/pricing';

const avatarClasses = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'];
const initials = ['J', 'P', 'S', 'L', 'N', 'A', 'R', 'T', 'E', 'K', 'D', 'O'];

function rollTo(roll: HTMLElement, value: number) {
  const tens = roll.querySelector<HTMLElement>('[data-col="tens"]');
  const ones = roll.querySelector<HTMLElement>('[data-col="ones"]');
  if (!tens || !ones) return;
  const t = Math.floor(value / 10);
  tens.classList.toggle('hidden-col', t === 0);
  tens.querySelector<HTMLElement>('.strip')?.style.setProperty('--digit', String(t));
  ones.querySelector<HTMLElement>('.strip')?.style.setProperty('--digit', String(value % 10));
}

/** Wires the two controls, the rolling total, the live sentence, and the sliding roster. */
export function initPricingCalculator(root: HTMLElement): void {
  const invitedInput = root.querySelector<HTMLInputElement>('[data-input="invited"]');
  const coveredInput = root.querySelector<HTMLInputElement>('[data-input="covered"]');
  const roll = root.querySelector<HTMLElement>('[data-roll]');
  const roster = root.querySelector<HTMLElement>('[data-roster]');
  const total = root.querySelector<HTMLElement>('[data-total]');
  const rest = root.querySelector<HTMLElement>('[data-rest]');
  if (!invitedInput || !coveredInput || !roll || !roster || !total || !rest) return;

  const people: HTMLLIElement[] = [];

  const addPerson = (index: number) => {
    const li = document.createElement('li');
    li.className = 'person';
    const avatar = document.createElement('span');
    avatar.className = `avatar big ${avatarClasses[index % avatarClasses.length]}`;
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initials[index % initials.length] ?? '?';
    const status = document.createElement('span');
    status.className = 'status';
    li.append(avatar, status);
    roster.append(li);
    people.push(li);
  };

  const removePerson = () => {
    const li = people.pop();
    if (!li) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      li.remove();
      return;
    }
    li.style.animation = '';
    li.classList.add('leaving');
    window.setTimeout(() => li.remove(), 350);
  };

  const syncSteppers = () => {
    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
      const input = btn.dataset.step === 'invited' ? invitedInput : coveredInput;
      const next = Number(input.value) + Number(btn.dataset.dir);
      btn.disabled = next < Number(input.min) || next > Number(input.max);
    }
  };

  const syncRoster = (invited: number, covered: number) => {
    while (people.length < invited) addPerson(people.length);
    while (people.length > invited) removePerson();
    people.forEach((li, i) => {
      const isCovered = i < covered;
      li.classList.toggle('free', isCovered);
      li.classList.toggle('paid', !isCovered);
      const status = li.querySelector<HTMLElement>('.status');
      if (status) status.textContent = isCovered ? 'covered' : '€1';
    });
  };

  const pruneStrays = () => {
    const tracked = new Set<Element>(people);
    for (const li of roster.querySelectorAll('.person:not(.organizer):not(.leaving)')) {
      if (!tracked.has(li)) li.remove();
    }
  };

  const render = (first = false) => {
    const invited = Number(invitedInput.value);
    coveredInput.max = String(invited);
    if (Number(coveredInput.value) > invited) coveredInput.value = String(invited);
    const covered = Number(coveredInput.value);
    const paying = invited - covered;

    const invitedOut = root.querySelector('[data-value="invited"]');
    const coveredOut = root.querySelector('[data-value="covered"]');
    if (invitedOut) invitedOut.textContent = String(invited);
    if (coveredOut) coveredOut.textContent = String(covered);
    syncSteppers();
    syncRoster(invited, covered);

    rollTo(roll, paying);
    const copy = resultCopy(paying);
    total.textContent = copy.total;
    rest.textContent = copy.rest;
    if (first) for (const li of people) li.style.animation = 'none';
    pruneStrays();
  };

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    btn.addEventListener('click', () => {
      const input = btn.dataset.step === 'invited' ? invitedInput : coveredInput;
      input.value = String(Number(input.value) + Number(btn.dataset.dir));
      render();
    });
  }
  invitedInput.addEventListener('input', () => render());
  coveredInput.addEventListener('input', () => render());
  render(true);
}
