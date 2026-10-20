import { describe, expect, test } from 'vite-plus/test';
import { createBackendActions } from './backend';

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

  test.each(capabilityNames)('implements %s in the backend adapter', (capability) => {
    expect(backend[capability]).toBeTypeOf('function');
  });
});
