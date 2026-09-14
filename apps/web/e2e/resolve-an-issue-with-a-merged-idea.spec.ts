import {
  acceptGroupInvitation,
  applyIdea,
  approveIdea,
  by,
  createIssue,
  createTrip,
  idFromPath,
  ids,
  inviteGroupMember,
  openAppPath,
  openIdeaFromList,
  requestIdeaReview,
  signIn,
  startIdeaFromIssue,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('creates a trip, makes an issue, and resolves it with a merged idea', async ({
  browser,
  page
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const member = uniqueTestUser('approver');

  const tripId = await createTrip(page, { name: `Merge trip ${suffix}` });
  const issueId = await createIssue(page, {
    body: 'If it rains we need a museum day.',
    title: `Need indoor backup ${suffix}`,
    tripId
  });

  const ideaName = await startIdeaFromIssue(page);

  await updateTrip(page, { dateNotes: 'Indoor museum day if it rains' });
  await requestIdeaReview(page);

  const invitationUrl = await inviteGroupMember(page, member.email);
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await acceptGroupInvitation(memberPage, invitationUrl, member);
  await openIdeaFromList(memberPage, ideaName);
  await expect(memberPage).toHaveURL(/\/trips\/[^/]+\/ideas\/[^/]+/u, { timeout: 20_000 });
  await approveIdea(memberPage);
  await memberPage.close();
  await memberContext.close();

  await page.bringToFront();
  await openIdeaFromList(page, ideaName);
  await applyIdea(page);

  await openAppPath(page, `issues/${issueId}`);
  await expect(by(page, ids.issueStatus)).toHaveAttribute('data-status', 'closed');
  expect(idFromPath(page, 'issues')).toBe(issueId);
});
