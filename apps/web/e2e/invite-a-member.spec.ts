import {
  acceptGroupInvitation,
  addIdea,
  by,
  createTrip,
  ids,
  inviteGroupMember,
  openTripFromList,
  openTrips,
  signIn,
  tripCard,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('invites a member who can propose ideas but not edit the shared trip', async ({
  browser,
  page
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const member = uniqueTestUser('trip-member');
  const tripName = `Shared trip ${suffix}`;

  await createTrip(page, { name: tripName });
  const invitationUrl = await inviteGroupMember(page, member.email);

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await acceptGroupInvitation(memberPage, invitationUrl, member);
  await openTripFromList(memberPage, tripName);
  await expect(by(memberPage, ids.tripRole)).toHaveAttribute('data-role', 'participant');
  await expect(by(memberPage, ids.sharedTripBanner)).toBeVisible();
  await expect(by(memberPage, ids.sharedTripNewIdea)).toBeVisible();
  await expect(memberPage.getByRole('button', { name: 'Edit details' })).toHaveCount(0);

  await addIdea(memberPage, { name: `member/idea-${suffix}` });
  await updateTrip(memberPage, { dateNotes: 'First week of May' });

  await memberPage.close();
  await memberContext.close();

  await openTrips(page);
  await expect(tripCard(page, tripName)).toBeVisible();
});
