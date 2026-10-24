import { ConvexError } from 'convex/values';
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';
import type { Doc } from '#convex-generated/dataModel';
import {
  MAX_IDEA_NAME_LENGTH,
  MAX_PROPOSAL_TITLE_LENGTH
} from '#convex/modules/travel/versions/lengths';

/** Generated titles stay short enough to scan in the sidebar. */
export const MAX_AUTO_TITLE_LENGTH = 48;
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
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
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

  /** Open ideas retitle themselves after each edit until someone names them by hand. */
  static allowsAutoTitle(proposal: Doc<'tripProposals'>): boolean {
    if (proposal.status === 'merged' || proposal.status === 'closed') return false;
    switch (proposal.titleSource) {
      case 'user':
        return false;
      case 'auto':
      case 'default':
      case 'issue':
        return true;
    }
  }

  /** Cuts a generated title at a word boundary so it fits {@link MAX_AUTO_TITLE_LENGTH}. */
  static clampAutoTitle(value: string): string {
    const title = value
      .replace(/\s+/gu, ' ')
      .trim()
      .replace(/^["'“‘]+|["'”’.!?]+$/gu, '');
    if (title.length <= MAX_AUTO_TITLE_LENGTH) return title;
    const cut = title.slice(0, MAX_AUTO_TITLE_LENGTH + 1);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, MAX_AUTO_TITLE_LENGTH))
      .replace(/[\s,;:–—-]+$/gu, '')
      .trim();
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
