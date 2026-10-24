import {
  acceptGroupInvitation,
  addIdea,
  arrange,
  by,
  environment,
  expectGone,
  ids,
  inviteGroupMember,
  openSettingsGroupSection,
  openTripFromList,
  redeemGroupInvitationCode,
  reloadAppPage,
  signUp,
  uniqueSuffix,
  uniqueTestUser,
  updateTrip
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp, openSignedOutApp } from '@/journeys/open-app';

test('an invitation code copied from settings joins a new member to the group', async () => {
  await openApp();
  await environment.allowClipboard();
  const invitationCode = await inviteGroupMember();

  // The invited person's own screens are the next test; here they redeem the code in the backend.
  const member = await arrange.redeemInvitation(invitationCode);
  await reloadAppPage();
  await openSettingsGroupSection();
  await expect.element(page.getByText(member.name).first()).toBeVisible();
});

test('a member pastes an invitation code, joins the group and plans on its trips', async () => {
  const suffix = uniqueSuffix();
  const tripName = `Shared trip ${suffix}`;
  const invitationCode = await arrange.createInvitation();
  await arrange.createTrip({ name: tripName });

  await openSignedOutApp();
  await environment.allowClipboard();
  await signUp(uniqueTestUser('trip-member'));
  await acceptGroupInvitation(invitationCode);
  await openTripFromList(tripName);
  await expect.element(by(ids.tripHeading)).toBeVisible();
  await expect.element(by(ids.sharedTripNewIdea)).toBeVisible();
  await expectGone(page.getByRole('button', { name: 'Edit details' }));

  await addIdea({ name: `member/idea-${suffix}` });
  await updateTrip({ dateNotes: 'First week of May' });
});

test('opens the group gracefully when the code belongs to an existing membership', async () => {
  const { groupName } = await arrange.account();
  await openApp();
  await environment.allowClipboard();
  const invitationCode = await inviteGroupMember();

  await redeemGroupInvitationCode(invitationCode);

  await expect.element(by(ids.tripSwitcher)).toHaveAttribute('data-group-name', groupName);
  await expectGone(page.getByText('Unable to join group'));
});
