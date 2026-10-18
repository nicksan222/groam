import {
  type ChatEvent,
  type Person,
  type PlanRef,
  type ReactionKind,
  people,
  reactionLabels
} from '@/content/feature-conversations';
import { translateHtml, translateText } from '@/i18n/runtime';

/** Message time stamps cycle through one evening so the loop never runs past midnight. */
export const stamp = (n: number): string => {
  const minutes = 19 * 60 + 40 + (n % 20) * 3;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return translateText('Fri {time}', { time: `${hh}:${mm}` });
};

const svg = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

/** Reactions are drawn icons, so they render the same on every device. */
const reactionIcons: Record<ReactionKind, string> = {
  like: svg(
    '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.5 0 2.5 1.2 2.2 2.7L12.7 9H19a2 2 0 0 1 2 2.4l-1.2 6A2.5 2.5 0 0 1 17.4 20H7"/>'
  ),
  love: svg(
    '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>'
  ),
  cheer: svg(
    '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>'
  )
};

const avatar = (who: Person) =>
  `<span class="avatar avatar-${who}" aria-hidden="true">${people[who].initial}</span>`;

const localizedNames = (names: string) =>
  names
    .split(', ')
    .map((name) => translateText(name))
    .join(', ');

export const chipHtml = (kind: ReactionKind, count: number, names: string, mine = false) => {
  const shownNames = localizedNames(names);
  const reaction = translateText(reactionLabels[kind]);
  const label = translateText('{names} reacted with {reaction}', {
    names: shownNames,
    reaction
  });
  return translateHtml(
    `<span class="fc-chip" data-emoji="${kind}" data-count="${count}"${mine ? ' data-mine' : ''} title="${shownNames}" role="img" aria-label="${label}"><span class="fc-emoji">${reactionIcons[kind]}</span><span class="fc-n">${count}</span></span>`
  );
};

export const replyHtml = (who: Person, text: string) =>
  translateHtml(
    `<div class="fc-reply">${avatar(who)}<p><b>${people[who].name}</b> ${text}</p></div>`
  );

export type MessageParts = {
  id: string;
  who: Person;
  text: string;
  ref: PlanRef;
  time: string;
  replies?: string;
  reactions?: string;
  replyCount?: number;
};

export function messageHtml(m: MessageParts): string {
  const count = m.replyCount ?? 0;
  const label = count
    ? translateText(count === 1 ? '{count} reply' : '{count} replies', { count })
    : translateText('Reply');
  const name = people[m.who].name;
  const reactLabel = translateText('React to {name}’s message', { name });
  const react = translateText('React');
  return translateHtml(
    `<article class="fc-msg" data-id="${m.id}" data-ref="${m.ref}" data-replies="${count}">${avatar(m.who)}<div class="fc-main"><p class="fc-head"><b>${name}</b><span class="time">${m.time}</span></p><p class="fc-text">${m.text}</p><div class="fc-actions"><span class="fc-reactions" data-reactions>${m.reactions ?? ''}</span><button type="button" class="fc-btn" data-react aria-pressed="false" aria-label="${reactLabel}">${react}</button><button type="button" class="fc-btn" data-thread aria-expanded="true"${count ? '' : ' hidden'}>${label}</button></div><div class="fc-thread"><div class="fc-thread-inner" data-replies>${m.replies ?? ''}</div></div></div></article>`
  );
}

/** Folds the first `count` events into message markup for the server render and for resets. */
export function startingMessages(events: ChatEvent[], count: number): string {
  const byId = new Map<
    string,
    MessageParts & { reactionMap: Map<ReactionKind, string[]>; replyList: string[] }
  >();
  const order: string[] = [];
  let n = 0;
  for (const event of events.slice(0, count)) {
    if (event.kind === 'message') {
      byId.set(event.id, { ...event, time: stamp(n++), reactionMap: new Map(), replyList: [] });
      order.push(event.id);
      continue;
    }
    const target = byId.get(event.to);
    if (!target) continue;
    if (event.kind === 'reply') target.replyList.push(replyHtml(event.who, event.text));
    else
      target.reactionMap.set(event.emoji, [
        ...(target.reactionMap.get(event.emoji) ?? []),
        people[event.who].name
      ]);
  }
  return order
    .map((id) => {
      const m = byId.get(id);
      if (!m) return '';
      return messageHtml({
        ...m,
        replies: m.replyList.join(''),
        replyCount: m.replyList.length,
        reactions: [...m.reactionMap]
          .map(([kind, names]) => chipHtml(kind, names.length, names.join(', ')))
          .join('')
      });
    })
    .join('');
}
