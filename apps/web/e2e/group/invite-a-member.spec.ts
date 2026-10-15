import {
  acceptGroupInvitation,
  addIdea,
  by,
  ids,
  inviteGroupMember,
  openApp,
  openTrip,
  openTripFromList,
  openTrips,
  redeemGroupInvitationCode,
  tripCard,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('copies and pastes an invitation code that joins a member to the group', async ({
  arrange,
  newSignedOutPage,
  page
}) => {
  test.setTimeout(180_000);
  const suffix = uniqueSuffix();
  const member = uniqueTestUser('trip-member');
  const tripName = `Shared trip ${suffix}`;

  await openTrip(page, await arrange.createTrip({ name: tripName }));
  const invitationCode = await inviteGroupMember(page);

  const memberPage = await newSignedOutPage();
  await acceptGroupInvitation(memberPage, invitationCode, member);
  await openTripFromList(memberPage, tripName);
  await expect(by(memberPage, ids.tripRole)).toHaveAttribute('data-role', 'participant');
  await expect(by(memberPage, ids.sharedTripBanner)).toBeVisible();
  await expect(by(memberPage, ids.sharedTripNewIdea)).toBeVisible();
  await expect(memberPage.getByRole('button', { name: 'Edit details' })).toHaveCount(0);

  await addIdea(memberPage, { name: `member/idea-${suffix}` });
  await updateTrip(memberPage, { dateNotes: 'First week of May' });

  await openTrips(page);
  await expect(tripCard(page, tripName)).toBeVisible();
});

test('opens the group gracefully when the code belongs to an existing membership', async ({
  page
}) => {
  test.setTimeout(90_000);
  await openApp(page);
  const groupName = await by(page, ids.groupSwitcher).getAttribute('data-group-name');
  if (!groupName) throw new Error('Expected an active group before redeeming its invitation');
  const invitationCode = await inviteGroupMember(page);

  await redeemGroupInvitationCode(page, invitationCode);

  await expect(by(page, ids.groupSwitcher)).toHaveAttribute('data-group-name', groupName);
  await expect(page.getByText('Unable to join group')).toHaveCount(0);
});
