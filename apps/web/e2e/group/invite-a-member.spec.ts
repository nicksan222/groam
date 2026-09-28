import {
  acceptGroupInvitation,
  addIdea,
  by,
  createTrip,
  ids,
  inviteGroupMember,
  openTripFromList,
  openTrips,
  redeemGroupInvitationCode,
  signIn,
  tripCard,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('copies and pastes an invitation code that joins a member to the group', async ({
  browser,
  page
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const member = uniqueTestUser('trip-member');
  const tripName = `Shared trip ${suffix}`;

  await createTrip(page, { name: tripName });
  const invitationCode = await inviteGroupMember(page);

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await acceptGroupInvitation(memberPage, invitationCode, member);
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

test('opens the group gracefully when the code belongs to an existing membership', async ({
  page
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  const groupName = await by(page, ids.groupSwitcher).getAttribute('data-group-name');
  if (!groupName) throw new Error('Expected an active group before redeeming its invitation');
  const invitationCode = await inviteGroupMember(page);

  await redeemGroupInvitationCode(page, invitationCode);

  await expect(by(page, ids.groupSwitcher)).toHaveAttribute('data-group-name', groupName);
  await expect(page.getByText('Unable to join group')).toHaveCount(0);
});
