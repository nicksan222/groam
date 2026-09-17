import type { Page } from '@playwright/test';
import { acceptGroupInvitation } from './accept-group-invitation';
import { inviteGroupMember } from './invite-group-member';
import type { TestUserCredentials } from './unique-test-user';

export type BrowserContextFactory = {
  newContext: () => Promise<{
    close: () => Promise<void>;
    newPage: () => Promise<Page>;
  }>;
};

export async function addGroupMemberViaInvite(
  browser: BrowserContextFactory,
  ownerPage: Page,
  member: TestUserCredentials
): Promise<void> {
  const invitationCode = await inviteGroupMember(ownerPage);
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await acceptGroupInvitation(memberPage, invitationCode, member);
  await memberPage.close();
  await memberContext.close();
  await ownerPage.bringToFront();
}
