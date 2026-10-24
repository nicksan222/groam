import { expect, test } from 'vite-plus/test';
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
  expect(reviewer).toContain('file change requests only for blocking problems');
  expect(reviewer).not.toContain('Do not create additional issues assigned to yourself');
});

test('teaches generated forms only in private chats', () => {
  const privateChat = assistantInstructions('groam', 'private', []);
  expect(privateChat).toContain('```spec');
  expect(privateChat).toContain('Recap card');
  const discussion = assistantInstructions('groam', 'discussion', []);
  expect(discussion).not.toContain('```spec');
  expect(discussion).not.toContain('use the generated UI format below');
  expect(discussion).not.toContain('askUserChoice');
  expect(discussion).toContain('Group chats cannot render generated forms');
});

test('adds the research subject, brief, and links to discussion instructions', () => {
  const instructions = assistantInstructions('groam', 'discussion', [], {
    brief: 'Kid friendly, under €20',
    links: [
      { kind: 'destination', label: 'Lisbon' },
      { kind: 'idea', label: 'Museum day' }
    ],
    title: 'Museums in Lisbon'
  });
  expect(instructions).toContain('This conversation is a trip research about "Museums in Lisbon".');
  expect(instructions).toContain('Research brief: Kid friendly, under €20');
  expect(instructions).toContain('- destination: Lisbon');
  expect(instructions).toContain('- idea: Museum day');
});

test('omits research context when absent, brief-less, or outside discussions', () => {
  expect(assistantInstructions('groam', 'discussion', [])).not.toContain(
    'This conversation is a trip research'
  );
  const bare = assistantInstructions('groam', 'discussion', [], {
    brief: null,
    links: [],
    title: 'Hotels'
  });
  expect(bare).not.toContain('Research brief');
  expect(bare).toContain('No trip items are linked');
  expect(
    assistantInstructions('groam', 'private', [], { brief: null, links: [], title: 'x' })
  ).not.toContain('This conversation is a trip research');
});
