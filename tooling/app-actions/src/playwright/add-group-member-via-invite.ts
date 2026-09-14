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
  const invitationUrl = await inviteGroupMember(ownerPage, member.email);
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await acceptGroupInvitation(memberPage, invitationUrl, member);
  await memberPage.close();
  await memberContext.close();
  await ownerPage.bringToFront();
}
