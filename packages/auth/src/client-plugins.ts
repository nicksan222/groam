import { passkeyClient } from '@better-auth/passkey/client';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { organizationClient, twoFactorClient, usernameClient } from 'better-auth/client/plugins';
import { accountRecoveryClient } from './account-recovery-client';

export type GroamAuthPluginOptions = {
  crossDomain?: Parameters<typeof crossDomainClient>[0];
};

export function createGroamAuthPlugins({ crossDomain }: GroamAuthPluginOptions = {}) {
  return [
    usernameClient(),
    accountRecoveryClient(),
    passkeyClient(),
    twoFactorClient(),
    organizationClient(),
    convexClient(),
    crossDomainClient(crossDomain)
  ] as const;
}
