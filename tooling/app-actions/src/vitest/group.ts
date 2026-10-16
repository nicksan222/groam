import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by, dialogSubmit, groupSwitcherItem } from './locators';
import { expectGone, tap, enter } from './queries';

export async function openSettingsGroupSection(): Promise<void> {
  await tap(by(ids.navSettings));
  await expect.element(by(ids.settingsTitle)).toBeVisible();
  await tap(by(ids.settingsSectionGroup));
}

export async function openSettingsSecuritySection(): Promise<void> {
  await tap(by(ids.navSettings));
  await expect.element(by(ids.settingsTitle)).toBeVisible();
  await tap(by(ids.settingsSectionSecurity));
  await expect.poll(() => location.pathname).toMatch(/\/settings\/security\/?$/u);
}

export async function createGroup(input: { name: string }): Promise<void> {
  await tap(by(ids.groupSwitcher));
  await tap(by(ids.groupSwitcherNew));
  await enter(by(ids.createGroupName), input.name);
  await tap(dialogSubmit(ids.createGroupDialog));
  await expect.element(by(ids.groupSwitcher)).toHaveAttribute('data-group-name', input.name);
}

export async function switchGroup(input: { name: string }): Promise<void> {
  await tap(by(ids.groupSwitcher));
  await tap(groupSwitcherItem(input.name));
  await expect.element(by(ids.groupSwitcher)).toHaveAttribute('data-group-name', input.name);
}

export async function deleteCurrentGroup(input: { fallbackGroupName: string }): Promise<void> {
  await openSettingsGroupSection();
  await tap(by(ids.deleteGroup));
  await tap(by(ids.deleteGroupConfirm));
  await expect
    .element(by(ids.groupSwitcher))
    .toHaveAttribute('data-group-name', input.fallbackGroupName);
}

/** Opens the invite dialog, creates a code, copies it and returns the copied code. */
export async function inviteGroupMember(): Promise<string> {
  await tap(by(ids.navSettings));
  await tap(by(ids.settingsSectionGroup));
  await tap(by(ids.inviteMember));
  await expect.element(by(ids.inviteDialog)).toBeVisible();
  await tap(dialogSubmit(ids.inviteDialog));
  await expect.element(by(ids.invitationCode)).toBeVisible();
  const displayedCode = (by(ids.invitationCode).element() as HTMLInputElement).value;
  expect(displayedCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/u);
  await tap(page.getByRole('button', { name: 'Copy invitation code' }));
  await expect.element(page.getByRole('button', { name: 'Invitation code copied' })).toBeVisible();
  expect(await navigator.clipboard.readText()).toBe(displayedCode);
  await tap(by(ids.invitationDone));
  return displayedCode;
}

export async function redeemGroupInvitationCode(invitationCode: string): Promise<void> {
  await tap(by(ids.groupSwitcher));
  await tap(by(ids.groupSwitcherJoin));
  await expect.element(by(ids.joinGroupDialog)).toBeVisible();
  await enter(by(ids.joinGroupCode), invitationCode);
  await tap(dialogSubmit(ids.joinGroupDialog));
  await expectGone(by(ids.joinGroupDialog));
}

/** Pastes a copied invitation code into the onboarding join form and joins the group. */
export async function acceptGroupInvitation(invitationCode: string): Promise<void> {
  await navigator.clipboard.writeText(invitationCode);
  const codeInput = by(ids.joinGroupCode);
  await expect.element(codeInput).toBeVisible();
  await tap(codeInput);
  await userEvent.paste();
  await expect.element(codeInput).toHaveValue(invitationCode);
  await tap(page.getByRole('button', { name: 'Join group' }));
  await expect.element(by(ids.navTrips)).toBeVisible();
}
