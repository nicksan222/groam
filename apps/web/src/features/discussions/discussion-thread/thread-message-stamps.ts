import type { ThreadReactionStamp } from '@/types/discussions';

export const THREAD_REACTION_STAMPS = [
  { emoji: '👍', label: 'Agree' },
  { emoji: '❤️', label: 'Love this' },
  { emoji: '🎉', label: "Let's go" }
] as const;

export type { ThreadReactionStamp };

export function groupThreadReactions(
  reactions: Array<{ emoji: string; userId: string }>,
  viewerUserId?: string
): ThreadReactionStamp[] {
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const reaction of reactions) {
    const current = counts.get(reaction.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (viewerUserId && reaction.userId === viewerUserId) current.mine = true;
    counts.set(reaction.emoji, current);
  }

  const stamps: ThreadReactionStamp[] = [];
  const seen = new Set<string>();
  for (const stamp of THREAD_REACTION_STAMPS) {
    const current = counts.get(stamp.emoji);
    if (!current) continue;
    stamps.push({ ...stamp, ...current });
    seen.add(stamp.emoji);
  }
  for (const [emoji, current] of counts) {
    if (seen.has(emoji)) continue;
    stamps.push({ emoji, label: emoji, ...current });
  }
  return stamps;
}
