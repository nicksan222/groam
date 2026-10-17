import { expect, test } from 'vite-plus/test';
import { resumeFallbackNote, resumeNote } from '#convex/modules/assistant/engine/schema';

test('resume notes share their prefixes, with or without the stored outcome', () => {
  const outcome = {
    progress: null,
    snapshot: { kind: 'timer' as const },
    summary: 'Timer elapsed'
  };
  expect(resumeNote({ kind: 'timer', outcome: { ...outcome, reason: 'deadline' } })).toBe(
    'Wait met: timer elapsed. Continue the task.'
  );
  expect(resumeNote({ kind: 'timer', outcome: { ...outcome, reason: 'cancelled' } })).toBe(
    'Wait cancelled: Timer elapsed. Continue the task with this outcome.'
  );
  expect(resumeFallbackNote('met')).toBe('Wait met. Continue the task.');
  expect(resumeFallbackNote('deadline')).toBe('Wait expired. Continue the task.');
  expect(resumeFallbackNote('cancelled')).toBe('Wait cancelled. Continue the task.');
});
