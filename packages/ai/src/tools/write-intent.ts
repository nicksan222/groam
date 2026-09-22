/**
 * Write-intent gate: does the traveler's latest message explicitly request
 * the write described by a tool spec's `writeIntent` phrases?
 *
 * The model always decides WHICH tool to call from each spec's `guidance`
 * and tool description. This module decides only WHETHER a write tool may
 * run: every write spec declares the phrases that count as an explicit
 * request, and this matcher checks the prompt against those phrases with
 * three conservative guards — negation ("don't create"), retraction
 * ("…actually, don't do it"), and advice questions ("Should I merge?"
 * asks; "Merge the idea" acts).
 *
 * Pure and dependency-free so backend enforcement and unit tests share the
 * exact same policy. When in doubt it denies; the model then asks instead
 * of mutating.
 */
function intentWords(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
}

function wordsMatchAt(words: readonly string[], phrase: readonly string[], start: number): boolean {
  return phrase.every((word, index) => words[start + index] === word);
}

// Negations that cancel a write anywhere in the message ("never approve"
// stays denied no matter how far the verb is).
const writeNegations = [
  ['do', 'not'],
  ["don't"],
  ['not', 'ready', 'to'],
  ['no', 'need', 'to'],
  ['never']
] as const;

/**
 * Must sit immediately before the matched write verb, so “I can't go. Add
 * sunscreen” stays a write while “I can't go” alone stays a denial.
 */
const adjacentWriteNegations = [
  ['should', 'not'],
  ["shouldn't"],
  ['cannot'],
  ["can't"],
  ['will', 'not'],
  ["won't"],
  ['not', 'going', 'to']
] as const;

function hasPrefixNegation(words: readonly string[]): boolean {
  return (
    writeNegations.some((negation) => {
      const lastStart = words.length - negation.length;
      for (let start = 0; start <= lastStart; start += 1) {
        if (wordsMatchAt(words, negation, start)) return true;
      }
      return false;
    }) ||
    adjacentWriteNegations.some((negation) => {
      const start = words.length - negation.length;
      return start >= 0 && wordsMatchAt(words, negation, start);
    })
  );
}

function hasFollowingRetraction(words: readonly string[], from: number): boolean {
  const rest = words.slice(from).join(' ');
  if (
    /\b(?:actually\b.*\b(?:do not|don't)|never mind|don't do (?:it|that)|do not do (?:it|that)|no need to|not ready to)\b/iu.test(
      rest
    )
  ) {
    return true;
  }
  if (from >= words.length) return false;
  const last = words[words.length - 1];
  const secondLast = words[words.length - 2];
  const thirdLast = words[words.length - 3];
  if (last === 'no') return true;
  if (secondLast === 'no' && last === 'thanks') return true;
  return thirdLast === 'no' && secondLast === 'thank' && last === 'you';
}

const politenessPrefixes = new Set(['please', 'kindly', 'just']);

function leadingContentIndex(words: readonly string[]): number {
  let index = 0;
  while (index < words.length && politenessPrefixes.has(words[index] ?? '')) index += 1;
  return index;
}

function explanationIndex(words: readonly string[]): number {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word === 'explain' || word === 'describe' || word === 'recommend') return index;
    if (word === 'how' && words[index + 1] === 'to') return index;
    if (
      (word === 'tell' || word === 'show') &&
      words[index + 1] === 'me' &&
      words[index + 2] === 'whether'
    ) {
      return index;
    }
    if (
      word === 'whether' &&
      (words[index + 1] === 'i' || words[index + 1] === 'we') &&
      words[index + 2] === 'should'
    ) {
      return index;
    }
  }
  return -1;
}

// Verbs that can open either a command ("Approve …") or an advice question
// ("Check how to approve"). The advice guard below tells them apart.
const writeVerbsBeforeExplain = new Set([
  'add',
  'apply',
  'approve',
  'book',
  'change',
  'check',
  'create',
  'delete',
  'mark',
  'merge',
  'pack',
  'remove',
  'rename',
  'revoke',
  'save',
  'set',
  'unpack',
  'update',
  'withdraw'
]);

const adviceAfterWriteVerb = new Set([
  'how',
  'if',
  'what',
  'when',
  'whether',
  'which',
  'who',
  'why'
]);

function isAdviceWordAfterWriteVerb(verb: string, next: string | undefined): boolean {
  if (next === undefined) return false;
  // Only "update me …" is informational; "book me" / "mark me" are writes.
  return adviceAfterWriteVerb.has(next) || (verb === 'update' && next === 'me');
}

// Single scan for both directions: `wantAdvice` selects "check if …" advice
// ("Check how to approve" stays advice) versus a plain write ("Approve …").
function scanWriteVerb(words: readonly string[], end: number, wantAdvice: boolean): boolean {
  for (let index = 0; index < end; index += 1) {
    const word = words[index];
    if (!word || !writeVerbsBeforeExplain.has(word)) continue;
    if (isAdviceWordAfterWriteVerb(word, words[index + 1]) === wantAdvice) return true;
  }
  return false;
}

function hasWriteVerbBefore(words: readonly string[], end: number): boolean {
  return scanWriteVerb(words, end, false);
}

function hasWriteVerbThenAdvice(words: readonly string[]): boolean {
  return scanWriteVerb(words, words.length, true);
}

function isAdviceQuestion(prompt: string) {
  const words = intentWords(prompt);
  const contentIndex = leadingContentIndex(words);
  const first = words[contentIndex];
  if (first === 'should' || first === 'shall') return true;
  // How-to/explain is advice unless a write verb already appeared ("Approve … then explain").
  const adviceAt = explanationIndex(words);
  if (adviceAt >= 0 && !hasWriteVerbBefore(words, adviceAt)) return true;
  // "Check if I should approve" has no later "how to" / "whether I should".
  if (hasWriteVerbThenAdvice(words)) return true;
  // "What steps…" / "Is it okay to approve…" are advice even without "?".
  // Leading `do` is advice only as an auxiliary ("Do I…"), not "Do it" / "Do approve…".
  if (isLeadingAdviceWord(first)) return true;
  return questionSeeksAdvice(prompt, words, contentIndex, first);
}

function questionSeeksAdvice(
  prompt: string,
  words: readonly string[],
  contentIndex: number,
  first: string | undefined
): boolean {
  if (first === 'do') {
    const second = words[contentIndex + 1];
    if (second === 'it' || hasWriteVerbBefore(words.slice(contentIndex + 1), 1)) return false;
    return true;
  }
  if (!prompt.includes('?')) return false;
  if (first === 'can' || first === 'could' || first === 'would') {
    const second = words[contentIndex + 1];
    // "Can I approve…?" / "Could we merge…?" / "Would it be okay to…?" ask, not to act.
    if (second === 'i' || second === 'we' || second === 'it') return true;
    return /\b(?:explain|recommend|show|describe|tell me|whether|should i|should we)\b/iu.test(
      prompt
    );
  }
  return isLeadingAdviceWord(first) || first === 'do';
}

function isLeadingAdviceWord(word: string | undefined): boolean {
  return ['what', 'who', 'which', 'how', 'when', 'why', 'if', 'is', 'are', 'does'].includes(
    word ?? ''
  );
}

function hasExplicitGoAhead(prompt: string, advice: boolean) {
  // Advice questions are not confirmation, even with "go ahead" / "proceed".
  if (advice) return false;
  if (prompt.includes('?') || /\byes\s+or\s+no\b/iu.test(prompt)) {
    return /\b(?:confirm|proceed|go ahead)\b/iu.test(prompt);
  }
  return /\b(?:confirm|proceed|go ahead|yes)\b/iu.test(prompt);
}

function matchIntentRange(
  words: readonly string[],
  intent: string
): { end: number; start: number } | null {
  const parts = intent.split(/\s+\.\.\.\s+/u).map((part) => intentWords(part));
  const first = parts[0];
  if (!first || first.length === 0) return null;
  for (let start = 0; start <= words.length - first.length; start += 1) {
    if (!wordsMatchAt(words, first, start)) continue;
    const end = matchIntentParts(words, parts.slice(1), start + first.length);
    if (end !== null) return { end, start };
  }
  return null;
}

function matchIntentParts(
  words: readonly string[],
  parts: readonly (readonly string[])[],
  initialCursor: number
): number | null {
  let cursor = initialCursor;
  for (const part of parts) {
    if (part.length === 0) continue;
    let found: number | null = null;
    for (let index = cursor; index <= words.length - part.length; index += 1) {
      if (wordsMatchAt(words, part, index)) {
        found = index;
        break;
      }
    }
    if (found === null) return null;
    cursor = found + part.length;
  }
  return cursor;
}

function matchesExactWriteIntent(prompt: string, intents: readonly string[]) {
  const words = intentWords(prompt);
  const start = leadingContentIndex(words);
  return intents.some((intent) => {
    const phrase = intentWords(intent);
    return (
      phrase.length > 0 &&
      words.length - start === phrase.length &&
      wordsMatchAt(words, phrase, start) &&
      !hasPrefixNegation(words.slice(0, start)) &&
      !hasFollowingRetraction(words, words.length)
    );
  });
}

/**
 * True when `prompt` explicitly requests the write described by `intents`.
 * `...` inside an intent is a gap ("update ... packing" matches "update
 * Passport … on the packing list"). `exactIntents` are whole-message
 * confirmations ("Maybe", "Not going") accepted after politeness prefixes.
 * A bare follow-up confirmation ("yes", "do it", "go ahead") also counts,
 * so the model can confirm and act across two turns.
 */
export function requestsWriteIntent(
  prompt: string,
  intents: readonly string[] = [],
  exactIntents: readonly string[] = []
) {
  const advice = isAdviceQuestion(prompt);
  if (advice && !hasExplicitGoAhead(prompt, advice)) return false;
  if (matchesExactWriteIntent(prompt, exactIntents)) return true;
  const words = intentWords(prompt);
  for (const intent of intents) {
    const range = matchIntentRange(words, intent);
    if (
      range &&
      !hasPrefixNegation(words.slice(0, range.start)) &&
      !hasFollowingRetraction(words, range.end)
    ) {
      return true;
    }
  }
  if (/\b(?:cancel|no|do not|don't|not ready to|no need to)\b/iu.test(prompt)) return false;
  return /\b(?:confirm|proceed|yes)\b|\b(?:do it|go with)\b/iu.test(prompt);
}
