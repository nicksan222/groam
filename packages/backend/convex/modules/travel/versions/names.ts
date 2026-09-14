import { ConvexError } from 'convex/values';
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';
import type { Doc } from '#convex-generated/dataModel';

const MAX_IDEA_NAME_LENGTH = 64;
export const MAX_PROPOSAL_TITLE_LENGTH = 100;
const MAX_FRIENDLY_NAME_ATTEMPTS = 64;
const IDEA_NAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9])?$/u;

/** FNV-1a 32-bit. unique-names-generator hashes string seeds as a char-code sum. */
function seedNumber(seed: string): number {
  let hash = 2_166_136_261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Branch names and titles for trip ideas. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class IdeaNames {
  static custom(value: string): string {
    const name = value
      .trim()
      .replace(/\s+/gu, '-')
      .replace(/-+/gu, '-')
      .replace(/^-+|-+$/gu, '');
    if (name.length > MAX_IDEA_NAME_LENGTH) {
      throw new ConvexError(`Idea names can be at most ${MAX_IDEA_NAME_LENGTH} characters`);
    }
    if (
      name.length === 0 ||
      !IDEA_NAME_PATTERN.test(name) ||
      name.includes('..') ||
      name.includes('//') ||
      name.includes('@{') ||
      name.endsWith('.lock')
    ) {
      throw new ConvexError(
        'Use letters, numbers, periods, hyphens, underscores, or slashes in the idea name'
      );
    }
    return name;
  }

  static friendly(seed: string): string {
    return uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      length: 2,
      seed: seedNumber(seed),
      separator: '-',
      style: 'lowerCase'
    });
  }

  static uniqueFriendly(seed: string, taken: Iterable<string>): string {
    const used = taken instanceof Set ? taken : new Set(taken);
    for (let attempt = 0; attempt < MAX_FRIENDLY_NAME_ATTEMPTS; attempt += 1) {
      const name = IdeaNames.friendly(attempt === 0 ? seed : `${seed}:${attempt}`);
      if (!used.has(name)) return name;
    }
    throw new ConvexError('Could not generate a unique idea name');
  }

  static allowsAutoTitle(proposal: Doc<'tripProposals'>): boolean {
    switch (proposal.titleSource) {
      case 'user':
        return false;
      case 'auto':
      case 'default':
      case 'issue':
        return true;
      default:
        return (
          proposal.title.endsWith("'s trip idea") ||
          (proposal.issueId !== undefined && proposal.title.startsWith('Implement: '))
        );
    }
  }

  static normalizeTitle(value: string): string {
    const title = value.replace(/\s+/gu, ' ').trim();
    if (title.length === 0 || title.length > MAX_PROPOSAL_TITLE_LENGTH) {
      throw new ConvexError(
        `Idea titles must be between 1 and ${MAX_PROPOSAL_TITLE_LENGTH} characters`
      );
    }
    return title;
  }
}
