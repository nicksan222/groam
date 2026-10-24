import {
  applyIdea,
  arrange,
  by,
  idFromPath,
  ids,
  openAppPath,
  openIdeaFromQueue,
  openIssue,
  requestIdeaReview,
  startIdeaFromIssue,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

test('creates a trip, makes an issue, and resolves it with a merged idea', async () => {
  const suffix = uniqueSuffix();
  const member = await arrange.addMember('approver');
  const tripId = await arrange.createTrip({ name: `Merge trip ${suffix}` });
  await openApp();
  const issueTitle = `Need indoor backup ${suffix}`;
  const issueId = await openIssue(
    await arrange.createIssue({
      body: 'If it rains we need a museum day.',
      title: issueTitle,
      tripId
    })
  );

  const ideaName = await startIdeaFromIssue();

  await updateTrip({ dateNotes: 'Indoor museum day if it rains' });
  await requestIdeaReview();

  // A group member approves; their own screens are covered by view tests, so they use the backend.
  await arrange.approveIdea({ ideaName, memberEmail: member.email, tripId });

  await openIdeaFromQueue(tripId, issueTitle);
  await applyIdea();

  await openAppPath(`issues/${issueId}`);
  await expect.element(by(ids.issueStatus)).toHaveAttribute('data-status', 'closed');
  expect(idFromPath('issues')).toBe(issueId);
});
