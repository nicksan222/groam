import { expect, test } from 'vite-plus/test';
import { researchEffortSchema, researchEfforts, researchPolicy, researchPrompt } from './index';

test('effort changes execution and search context budgets', () => {
  expect(researchEfforts).toEqual(['quick', 'standard', 'deep']);
  const policies = researchEfforts.map(researchPolicy);
  expect(policies.map((policy) => policy.maxSteps)).toEqual([4, 8, 16]);
  expect(policies.map((policy) => policy.maxSearches)).toEqual([2, 5, 10]);
  expect(policies.map((policy) => policy.searchContextSize)).toEqual(['low', 'medium', 'high']);
  expect(researchEffortSchema.safeParse('unlimited').success).toBe(false);
});

test('research task carries purpose, evidence requirements and untrusted context', () => {
  const prompt = researchPrompt({
    topic: 'Hotels near Kyoto station',
    effort: 'deep',
    context: 'Budget: €150 per night',
    date: '2026-10-20'
  });
  expect(prompt).toContain('Hotels near Kyoto station');
  expect(prompt).toContain('Budget: €150 per night');
  expect(prompt).toContain('2026-10-20');
  expect(prompt).toContain('web search');
  expect(prompt).toContain('untrusted');
  expect(prompt).toContain('conflicting');
  expect(prompt).toContain('Never invent');
});
