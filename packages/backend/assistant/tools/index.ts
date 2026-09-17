import { assistantAgents } from '@groam/ai-contracts/agents/registry';
import type { ToolExecutionOptions, ToolSet } from 'ai';
import { ConvexError } from 'convex/values';
import type { AssistantTool, AssistantToolRuntime } from '#backend/assistant/tools/factory';
import { AssistantToolKind } from '#backend/assistant/tools/kind';
import '#backend/assistant/tools/kinds/index';

export type { AssistantToolRuntime } from '#backend/assistant/tools/factory';

const writeNegations = [
  ['do', 'not'],
  ["don't"],
  ['not', 'ready', 'to'],
  ['no', 'need', 'to'],
  ['never']
] as const;

/** Must sit immediately before the matched write verb, so “I can't go. Add sunscreen” stays a write. */
const adjacentWriteNegations = [
  ['should', 'not'],
  ["shouldn't"],
  ['cannot'],
  ["can't"],
  ['will', 'not'],
  ["won't"],
  ['not', 'going', 'to']
] as const;

function intentWords(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
}

function wordsMatchAt(words: readonly string[], phrase: readonly string[], start: number): boolean {
  return phrase.every((word, index) => words[start + index] === word);
}

function hasPrefixNegation(words: readonly string[]): boolean {
  if (
    writeNegations.some((negation) => {
      const lastStart = words.length - negation.length;
      for (let start = 0; start <= lastStart; start += 1) {
        if (wordsMatchAt(words, negation, start)) return true;
      }
      return false;
    })
  ) {
    return true;
  }
  return adjacentWriteNegations.some((negation) => {
    const start = words.length - negation.length;
    return start >= 0 && wordsMatchAt(words, negation, start);
  });
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
  if (adviceAfterWriteVerb.has(next)) return true;
  // Only "update me …" is informational; "book me" / "mark me" are writes.
  return verb === 'update' && next === 'me';
}

function hasWriteVerbBefore(words: readonly string[], end: number): boolean {
  for (let index = 0; index < end; index += 1) {
    const word = words[index];
    if (!word || !writeVerbsBeforeExplain.has(word)) continue;
    // "Check how to approve" / "Update me on whether…" stay advice.
    if (isAdviceWordAfterWriteVerb(word, words[index + 1])) continue;
    return true;
  }
  return false;
}

function hasWriteVerbThenAdvice(words: readonly string[]): boolean {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (!word || !writeVerbsBeforeExplain.has(word)) continue;
    if (isAdviceWordAfterWriteVerb(word, words[index + 1])) return true;
  }
  return false;
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

function hasExplicitGoAhead(prompt: string) {
  // Advice questions are not confirmation, even with "go ahead" / "proceed".
  if (isAdviceQuestion(prompt)) return false;
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
    const found = findPhraseAtOrAfter(words, part, cursor);
    if (found === null) return null;
    cursor = found + part.length;
  }
  return cursor;
}

function findPhraseAtOrAfter(
  words: readonly string[],
  phrase: readonly string[],
  cursor: number
): number | null {
  for (let index = cursor; index <= words.length - phrase.length; index += 1) {
    if (wordsMatchAt(words, phrase, index)) return index;
  }
  return null;
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

function explicitlyRequestsWrite(
  prompt: string,
  intents: readonly string[] = [],
  exactIntents: readonly string[] = []
) {
  if (isAdviceQuestion(prompt) && !hasExplicitGoAhead(prompt)) return false;
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

function denyUnrequestedWrite(name: string, tool: AssistantTool): AssistantTool {
  if (!tool.execute) return tool;
  return {
    ...tool,
    execute: async (_input: unknown, _options: ToolExecutionOptions<unknown>) => {
      throw new ConvexError(`${name} requires an explicit traveler request`);
    }
  } as AssistantTool;
}

/**
 * Builds the runtime tool set from the invoked agent's capabilities. Outside
 * this folder, use this facade — do not import the kind map.
 */
export function createRegisteredAssistantTools(runtime: AssistantToolRuntime): {
  guidance: string[];
  tools: ToolSet;
} {
  const allowed = new Set(assistantAgents[runtime.agentId].capabilities);
  const guidance: string[] = [];
  const tools: ToolSet = {};
  for (const registration of AssistantToolKind.all()) {
    if (!allowed.has(registration.id)) continue;
    registerAssistantToolSet(tools, runtime, registration);
    if (registration.guidance) guidance.push(registration.guidance);
  }
  return { guidance, tools };
}

function registerAssistantToolSet(
  tools: ToolSet,
  runtime: AssistantToolRuntime,
  registration: ReturnType<typeof AssistantToolKind.all>[number]
): void {
  const created = AssistantToolKind.toolSet(registration, runtime);
  if (!created) return;
  const writeAllowed = writeIsAllowed(runtime, registration);
  for (const [toolName, tool] of Object.entries(created)) {
    if (tools[toolName]) throw new ConvexError(`Duplicate assistant runtime tool: ${toolName}`);
    tools[toolName] = writeAllowed ? tool : denyUnrequestedWrite(toolName, tool);
  }
}

function writeIsAllowed(
  runtime: AssistantToolRuntime,
  registration: ReturnType<typeof AssistantToolKind.all>[number]
): boolean {
  return (
    runtime.scope === 'standalone' ||
    !(registration.writeIntent || registration.writeIntentExact) ||
    explicitlyRequestsWrite(
      runtime.prompt,
      registration.writeIntent ?? [],
      registration.writeIntentExact ?? []
    )
  );
}
