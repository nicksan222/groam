import { describe, expect, test } from 'vitest';
import { createBackendActions } from './backend';
import { createPlaywrightActions } from './playwright';

const capabilityNames = [
  'addActivity',
  'addDestinationToIdea',
  'addIdea',
  'addIssueComment',
  'applyIdea',
  'approveIdea',
  'archiveTrip',
  'assignIssue',
  'createIssue',
  'createTrip',
  'requestIdeaReview',
  'restoreTrip',
  'sendMessage',
  'setIssueStatus',
  'updateTrip'
] as const;

describe('app action adapters', () => {
  const backend = createBackendActions({
    convexUrl: 'http://127.0.0.1:3214',
    siteUrl: 'http://127.0.0.1:3215'
  });
  const playwright = createPlaywrightActions();

  test.each(capabilityNames)('implements %s in both adapters', (capability) => {
    expect(backend[capability]).toBeTypeOf('function');
    expect(playwright[capability]).toBeTypeOf('function');
  });
});
