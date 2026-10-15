import {
  applyIdea,
  approveIdea,
  by,
  idFromPath,
  ids,
  openAppPath,
  openIdeaFromList,
  openIssue,
  requestIdeaReview,
  signInAs,
  startIdeaFromIssue,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('creates a trip, makes an issue, and resolves it with a merged idea', async ({
  arrange,
  newSignedOutPage,
  page
}) => {
  test.setTimeout(180_000);
  const suffix = uniqueSuffix();
  const member = await arrange.addMember('approver');
  const tripId = await arrange.createTrip({ name: `Merge trip ${suffix}` });
  const issueId = await openIssue(
    page,
    await arrange.createIssue({
      body: 'If it rains we need a museum day.',
      title: `Need indoor backup ${suffix}`,
      tripId
    })
  );

  const ideaName = await startIdeaFromIssue(page);

  await updateTrip(page, { dateNotes: 'Indoor museum day if it rains' });
  await requestIdeaReview(page);

  const memberPage = await newSignedOutPage();
  await signInAs(memberPage, member);
  await openIdeaFromList(memberPage, ideaName);
  await expect(memberPage).toHaveURL(/\/trips\/[^/]+\/ideas\/[^/]+/u, { timeout: 20_000 });
  await approveIdea(memberPage);

  await page.bringToFront();
  await openIdeaFromList(page, ideaName);
  await applyIdea(page);

  await openAppPath(page, `issues/${issueId}`);
  await expect(by(page, ids.issueStatus)).toHaveAttribute('data-status', 'closed');
  expect(idFromPath(page, 'issues')).toBe(issueId);
});
