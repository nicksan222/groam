export const AGENT_MENTION_TOKEN = '@groam';

const MENTION_PATTERN = /(?:^|\s)@groam(?=\s|$)/iu;
const PARTIAL_AT_PATTERN = /(^|\s)@([^\s@]*)$/u;

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
    .replace(/(^|\s)@groam(?=\s|$)/giu, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+/, '');
}

/** Returns the in-progress @query at the caret, or null when not suggesting. */
export function agentMentionQuery(text: string, caret: number): string | null {
  const before = text.slice(0, caret);
  const match = PARTIAL_AT_PATTERN.exec(before);
  if (!match) return null;
  const query = match[2] ?? '';
  if (query.length > 0 && !'groam'.startsWith(query.toLowerCase())) return null;
  return query;
}

export function replaceAgentMentionQuery(
  text: string,
  caret: number
): { caret: number; text: string } {
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const match = PARTIAL_AT_PATTERN.exec(before);
  if (!match) {
    const next = insertAgentMention(text);
    return { caret: next.length, text: next };
  }
  const start = match.index + (match[1]?.length ?? 0);
  const next = `${before.slice(0, start)}${AGENT_MENTION_TOKEN} ${after}`;
  return { caret: start + AGENT_MENTION_TOKEN.length + 1, text: next };
}
