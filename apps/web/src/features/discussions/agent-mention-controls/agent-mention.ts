import type {
  ComposerItemValue,
  ComposerPart,
  ComposerTrigger,
  ComposerValue
} from '@groam/ui/components/composer';
import { getComposerText } from '@groam/ui/components/composer';

export const AGENT_MENTION_TOKEN = '@groam';

const AGENT_HANDLE = 'groam';
const MENTION_PATTERN = /(?:^|\s)@groam(?=\s|$)/iu;
const MENTION_TEXT_PATTERN = /(^|\s)@groam(?=\s|$)/giu;

export function hasAgentMention(text: string): boolean {
  return MENTION_PATTERN.test(text);
}

export function insertAgentMention(text: string): string {
  if (hasAgentMention(text)) return text.endsWith(' ') || text.length === 0 ? text : `${text} `;
  const trimmed = text.trimEnd();
  if (trimmed.length === 0) return `${AGENT_MENTION_TOKEN} `;
  return `${trimmed} ${AGENT_MENTION_TOKEN} `;
}

export function removeAgentMention(text: string): string {
  return text
    .replace(MENTION_TEXT_PATTERN, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+/, '');
}

/** The "@" suggestion; its composer text is exactly {@link AGENT_MENTION_TOKEN}. */
export const AGENT_MENTION_ITEM: ComposerItemValue = {
  description: 'Ask Groam — reply visible to everyone',
  id: AGENT_HANDLE,
  kind: 'agent',
  label: AGENT_HANDLE
};

/** Composer "@" trigger: offers @groam while the typed handle is a prefix of it. */
export const agentMentionTrigger: ComposerTrigger = {
  character: '@',
  filter: (item, query) => item.label.startsWith(query.toLowerCase()),
  items: [AGENT_MENTION_ITEM],
  maxQueryLength: AGENT_HANDLE.length
};

const AGENT_MENTION_PART: ComposerPart = {
  id: AGENT_HANDLE,
  kind: 'agent',
  label: AGENT_HANDLE,
  trigger: '@',
  type: 'mention'
};

function isAgentToken(part: ComposerPart): boolean {
  return part.type === 'mention' && part.id === AGENT_HANDLE;
}

export function hasAgentMentionValue(value: ComposerValue): boolean {
  return hasAgentMention(getComposerText(value));
}

/** Appends an @groam token (with separating spaces) unless the draft already mentions Groam. */
export function insertAgentMentionValue(value: ComposerValue): ComposerValue {
  if (hasAgentMentionValue(value)) return value;
  const text = getComposerText(value);
  const lead: ComposerPart[] = text.length > 0 && !/\s$/u.test(text) ? [textPart(' ')] : [];
  return [...value, ...lead, AGENT_MENTION_PART, textPart(' ')];
}

/** Drops @groam tokens and typed @groam handles from the draft. */
export function removeAgentMentionValue(value: ComposerValue): ComposerValue {
  const text = removeAgentMention(getComposerText(value.filter((part) => !isAgentToken(part))));
  return text.length > 0 ? [textPart(text)] : [];
}

function textPart(text: string): ComposerPart {
  return { text, type: 'text' };
}
