import { mockModel } from '@convex-dev/agent';
import { describe, expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import {
  draftRuleWithModel,
  ruleCatalog,
  ruleDraftPrompt,
  ruleSystemPrompt
} from '#convex/modules/travel/issues/rules/draft';
import { MAX_RULE_PROMPT_LENGTH } from '#convex/modules/travel/issues/rules/index';
import { clauseKindList } from '#convex/modules/travel/issues/rules/kinds/index';
import { setupGroup } from '#testing/trips';

const reply = (output: { rule: unknown; understood?: boolean }) => [
  {
    text: JSON.stringify({
      rule: typeof output.rule === 'string' ? output.rule : JSON.stringify(output.rule),
      understood: output.understood ?? true
    }),
    type: 'text' as const
  }
];

/** The generate calls the mock model recorded; typed away by `mockModel`'s return type. */
const callsOf = (model: unknown) =>
  (model as { doGenerateCalls: Array<{ prompt: unknown }> }).doGenerateCalls;

const dinners = {
  items: [
    { count: 1, kind: 'daily_activities', titleIncludes: ' dinner ' },
    {
      clauses: [{ kind: 'nights_covered' }, { boundary: 'arrival', kind: 'boundary_transfer' }],
      kind: 'group',
      match: 'any'
    }
  ],
  match: 'all'
};

describe('draftRuleWithModel', () => {
  test('turns a sentence into a normalized, labeled rule', async () => {
    const drafted = await draftRuleWithModel(
      mockModel({ content: reply({ rule: dinners }) }),
      'Every day has a dinner, and we have somewhere to stay'
    );
    expect(drafted.rule.items[0]).toMatchObject({
      kind: 'daily_activities',
      titleIncludes: 'dinner'
    });
    expect(drafted.label).toContain('dinner');
  });

  test('sends a refused rule back once with the reason', async () => {
    const model = mockModel({
      contentSteps: [
        reply({ rule: { items: [{ kind: 'made_up' }], match: 'all' } }),
        reply({ rule: { items: [{ kind: 'within_budget' }], match: 'all' } })
      ]
    });
    const drafted = await draftRuleWithModel(model, 'Stay on budget');
    expect(drafted.rule).toEqual({ items: [{ kind: 'within_budget' }], match: 'all' });
  });

  test('refuses what the trip cannot check, broken JSON, and blank requests', async () => {
    await expect(
      draftRuleWithModel(
        mockModel({ content: reply({ rule: '{}', understood: false }) }),
        'Everyone is happy'
      )
    ).rejects.toThrow('does not map');
    await expect(
      draftRuleWithModel(mockModel({ content: reply({ rule: 'not json' }) }), 'Stay on budget')
    ).rejects.toThrow('not valid JSON');
    await expect(draftRuleWithModel(mockModel(), '   ')).rejects.toThrow('Describe when');
  });
});

describe('rule prompt', () => {
  test('lists every registered kind with a group example', () => {
    const catalog = ruleCatalog();
    for (const { kind } of clauseKindList) expect(catalog).toContain(`- ${kind} (`);
    const system = ruleSystemPrompt();
    expect(system).toContain(catalog);
    expect(system).toContain('"kind":"group"');
  });

  test('adds the refusal reason only after a failed attempt', () => {
    expect(ruleDraftPrompt('Stay on budget', null)).toBe('Stay on budget');
    expect(ruleDraftPrompt('Stay on budget', 'bad shape')).toContain('refused: bad shape');
  });
});

describe('draft retries and limits', () => {
  test('second attempt sees the refusal reason in its prompt', async () => {
    const model = mockModel({
      contentSteps: [
        reply({ rule: 'not json' }),
        reply({ rule: { items: [{ kind: 'within_budget' }], match: 'all' } })
      ]
    });
    await draftRuleWithModel(model, 'Stay on budget');
    expect(JSON.stringify(callsOf(model)[1]?.prompt)).toContain('The rule was not valid JSON');
    expect(JSON.stringify(callsOf(model)[0]?.prompt)).not.toContain('refused');
  });

  test('two invalid attempts end in an error naming the last reason', async () => {
    const model = mockModel({
      contentSteps: [
        reply({ rule: 'not json' }),
        reply({ rule: { items: [{ kind: 'made_up' }], match: 'all' } })
      ]
    });
    await expect(draftRuleWithModel(model, 'Stay on budget')).rejects.toThrow(
      /Could not build a rule from that: .*condition shapes/u
    );
    expect(callsOf(model)).toHaveLength(2);
  });

  test('understood=false stops without a retry', async () => {
    const model = mockModel({ content: reply({ rule: '{}', understood: false }) });
    await expect(draftRuleWithModel(model, 'Everyone is happy')).rejects.toThrow('does not map');
    expect(callsOf(model)).toHaveLength(1);
  });

  test('blank and oversized requests never reach the model', async () => {
    const model = mockModel({ content: reply({ rule: '{}' }) });
    await expect(draftRuleWithModel(model, '  ')).rejects.toThrow('Describe when');
    await expect(draftRuleWithModel(model, 'x'.repeat(MAX_RULE_PROMPT_LENGTH + 1))).rejects.toThrow(
      'Keep it under'
    );
    expect(callsOf(model)).toHaveLength(0);
  });
});

describe('rule draft route', () => {
  test("uses only the caller's own ChatGPT connection", { timeout: 15_000 }, async () => {
    const { owner } = await setupGroup();
    await expect(
      owner.client.action(api.routes.trips.issues.rule.draft.run, { text: 'Stay on budget' })
    ).rejects.toThrow(/ChatGPT/u);
  });

  test(
    'refuses blank requests without spending the hourly drafts',
    { timeout: 15_000 },
    async () => {
      const { owner } = await setupGroup();
      const draft = (text: string) =>
        owner.client.action(api.routes.trips.issues.rule.draft.run, { text });
      // More blank requests than the bucket holds: none of them counts against it.
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await expect(draft('   ')).rejects.toThrow('Describe when this issue is done');
      }
      await expect(draft('x'.repeat(MAX_RULE_PROMPT_LENGTH + 1))).rejects.toThrow(
        `Keep it under ${MAX_RULE_PROMPT_LENGTH} characters`
      );
      await expect(draft('Stay on budget')).rejects.toThrow(/ChatGPT/u);
    }
  );
});
