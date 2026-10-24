/**
 * The draft left after `sent` went out while the person kept typing: whatever they added after
 * it, or their edited text untouched when they changed what was sent.
 */
export function draftAfterSend(current: string, sent: string): string {
  if (current === sent) return '';
  return current.startsWith(sent) ? current.slice(sent.length).trimStart() : current;
}
