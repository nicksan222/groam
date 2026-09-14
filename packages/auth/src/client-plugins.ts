import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';

export type GroamAuthPluginOptions = {
  crossDomain?: Parameters<typeof crossDomainClient>[0];
};

export function createGroamAuthPlugins({ crossDomain }: GroamAuthPluginOptions = {}) {
  return [organizationClient(), convexClient(), crossDomainClient(crossDomain)] as const;
}
