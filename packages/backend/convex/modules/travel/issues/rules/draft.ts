import { generateText, type LanguageModel, NoObjectGeneratedError, Output } from 'ai';
import { validate } from 'convex-helpers/validators';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import type { ActionCtx } from '#convex-generated/server';
import { AssistantProvider, type AssistantCredentialScope } from '#convex/modules/ai/provider';
import {
  type ClauseField,
  clauseFields,
  clauseKind,
  clauseKinds,
  createClause,
  type IssueRule,
  MAX_GROUP_CLAUSES,
  MAX_RULE_ITEMS,
  MAX_RULE_PROMPT_LENGTH,
  normalizeRule,
  ruleLabel
} from '#convex/modules/travel/issues/rules/index';
import { RuleValidators } from '#convex/modules/travel/issues/rules/schema';
import type { ClauseKind } from '#convex/modules/travel/issues/rules/types';

/**
 * Turns a person's sentence ("every day has a dinner and we have a hotel each night") into a
 * typed rule. The model writes rule JSON against a catalog built from `clauseKinds`, so new
 * kinds reach the prompt on their own; the result must pass the rule validator and
 * `normalizeRule` like anything a person builds, or it is refused.
 */

const MAX_OUTPUT_TOKENS = 2048;
const ATTEMPTS = 2;

const ruleOutput = z.object({
  rule: z
    .string()
    .describe('The rule as one JSON object: {"match": ..., "items": [...]}. No markdown.'),
  understood: z
    .boolean()
    .describe('False when the request cannot be expressed with the listed condition kinds.')
});

/** "count (Activities per day): whole number", from the kind's builder fields. */
function fieldNote(field: ClauseField): string {
  const name = `${field.key} (${field.label})`;
  switch (field.type) {
    case 'number': {
      return `${name}: whole number`;
    }
    case 'text': {
      return `${name}: ${field.optional ? 'optional ' : ''}short text`;
    }
    case 'choice': {
      return `${name}: ${field.any ? 'optional, ' : ''}one of ${Object.keys(field.options).join(', ')}`;
    }
  }
}

const MATCH_MODES = '"all" | "any" | "none"';

const groupExample = {
  clauses: [createClause('nights_covered'), createClause('boundary_transfer')],
  kind: 'group',
  match: 'any'
};

/** One line per kind (name, title, description, settings, example), so new kinds reach the prompt. */
export function ruleCatalog(): string {
  return (Object.keys(clauseKinds) as Array<ClauseKind>)
    .map((kind) => {
      const { description, title } = clauseKind(kind);
      const fields = clauseFields(kind).map(fieldNote);
      const settings = fields.length > 0 ? ` Settings: ${fields.join('; ')}.` : '';
      return `- ${kind} (${title}): ${description}${settings} Example: ${JSON.stringify(createClause(kind))}`;
    })
    .join('\n');
}

/** The full system prompt. Pure, so tests can read exactly what the model is told. */
export function ruleSystemPrompt(): string {
  return [
    'You turn a trip planner\'s sentence into a "done when" rule for a group trip issue.',
    'The rule is checked against the shared trip; the issue moves to Done while it holds.',
    'Reply with the rule as JSON in `rule`, built only from these condition kinds:',
    ruleCatalog(),
    '',
    `Shape: {"match": ${MATCH_MODES}, "items": [condition or group]}.`,
    `A group joins a few conditions under its own mode: {"kind": "group", "match": ${MATCH_MODES}, "clauses": [conditions]}. Groups hold conditions only and do not nest. Example: ${JSON.stringify(groupExample)}`,
    'Use "all" when every item must hold, "any" when one is enough, and "none" when none may hold.',
    `At most ${MAX_RULE_ITEMS} items, and at most ${MAX_GROUP_CLAUSES} conditions per group.`,
    'Counts are whole minimums ("at least"); every check covers the whole trip.',
    'Leave optional settings out rather than null. Use only the settings each kind lists.',
    'Prefer few, specific conditions. If nothing fits, set understood to false.'
  ].join('\n');
}

/** The prompt for one attempt; after a refusal it carries the reason so the model can fix it. */
export function ruleDraftPrompt(request: string, feedback: string | null): string {
  return feedback === null
    ? request
    : `${request}\n\nYour last rule was refused: ${feedback}. Fix it.`;
}

function parse(text: string): IssueRule {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ConvexError('The rule was not valid JSON');
  }
  if (!validate(RuleValidators.rule, value)) {
    throw new ConvexError('The rule did not match the condition shapes');
  }
  return normalizeRule(value);
}

function problem(error: unknown): string {
  return error instanceof ConvexError && typeof error.data === 'string'
    ? error.data
    : 'The rule was not valid';
}

/** Trims and bounds the request; the one place the input limits live. */
export function checkedRuleRequest(text: string): string {
  const request = text.trim();
  if (request.length === 0) throw new ConvexError('Describe when this issue is done');
  if (request.length > MAX_RULE_PROMPT_LENGTH) {
    throw new ConvexError(`Keep it under ${MAX_RULE_PROMPT_LENGTH} characters`);
  }
  return request;
}

async function draftChecked(
  languageModel: LanguageModel,
  request: string
): Promise<{ label: string; rule: IssueRule }> {
  const system = ruleSystemPrompt();
  let feedback: string | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    let output: z.infer<typeof ruleOutput>;
    try {
      ({ output } = await generateText({
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        model: languageModel,
        output: Output.object({ schema: ruleOutput }),
        prompt: ruleDraftPrompt(request, feedback),
        system
      }));
    } catch (error: unknown) {
      if (!NoObjectGeneratedError.isInstance(error)) throw error;
      feedback = 'The reply was not the requested {rule, understood} object';
      continue;
    }
    if (!output.understood) {
      throw new ConvexError('That does not map to anything the trip can check. Try rephrasing.');
    }
    try {
      const rule = parse(output.rule);
      return { label: ruleLabel(rule), rule };
    } catch (error: unknown) {
      feedback = problem(error);
    }
  }
  throw new ConvexError(`Could not build a rule from that: ${feedback ?? 'try rephrasing'}`);
}

/**
 * One sentence in, one checked rule out, with its plain-English label. A refused rule goes back
 * to the model once with the reason before the person sees an error.
 */
export async function draftRuleWithModel(
  languageModel: LanguageModel,
  text: string
): Promise<{ label: string; rule: IssueRule }> {
  return await draftChecked(languageModel, checkedRuleRequest(text));
}

/** Drafts with the initiating person's own ChatGPT connection. */
export async function draftRuleFromText(
  ctx: ActionCtx,
  scope: AssistantCredentialScope,
  text: string
): Promise<{ label: string; rule: IssueRule }> {
  const request = checkedRuleRequest(text);
  const { languageModel } = await AssistantProvider.configured(ctx, scope);
  return await draftChecked(languageModel, request);
}
