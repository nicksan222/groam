import { expect, test } from 'vitest';
import { assistantInstructions } from './index';

test('instructs agents to answer complete recommendation requests without asking a follow-up', () => {
  const instructions = assistantInstructions('groam', 'private', []);

  expect(instructions).toContain(
    'When the traveler asks you to review, suggest, recommend, summarize, or explain, do the work directly in the same response.'
  );
  expect(instructions).toContain('Ask at most one or two focused questions in a response');
  expect(instructions).toContain('For multi-step requests, chain the available tools');
  expect(instructions).toContain('answer about its trip without asking which trip they mean');
  expect(instructions).toContain('You are Groam’s single screen-aware travel companion.');
});

test('keeps standalone prompts specific to the assigned worker kind', () => {
  expect(() => assistantInstructions('groam', 'standalone', [])).toThrow(
    'groam is a chat agent and cannot run standalone'
  );
  const issue = assistantInstructions('issue', 'standalone', []);
  expect(issue).toContain('You are Issue agent');
  expect(issue).toContain('Do not create additional issues assigned to yourself');
  expect(issue).not.toContain('File blocking comments');
  const reviewer = assistantInstructions('reviewer', 'standalone', []);
  expect(reviewer).toContain('You are Idea reviewer');
  expect(reviewer).toContain('File blocking comments only when something should stop apply');
  expect(reviewer).not.toContain('Do not create additional issues assigned to yourself');
});
