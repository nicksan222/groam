import type { AiKeyProviderId } from '@groam/ai-contracts/providers/keys';

export type AiProviderAuthSessionData = Record<string, string>;

export type AiProviderAuthTarget = 'organization' | 'personal';

export type AiProviderAuthSession = {
  data: AiProviderAuthSessionData;
  organizationId: string | null;
  provider: AiKeyProviderId;
  target: AiProviderAuthTarget;
};

export type AiProviderAuthStart = {
  authorizationUrl: string;
  data: AiProviderAuthSessionData;
};

export interface AiProviderAuthStrategy {
  readonly connectLabel: string;
  readonly connectedMessage: string;
  readonly provider: AiKeyProviderId;

  begin(callbackUrl: string): Promise<AiProviderAuthStart>;
  clearCallback(callbackUrl: URL): void;
  complete(callbackUrl: URL, data: AiProviderAuthSessionData): Promise<string>;
  hasCallback(callbackUrl: URL): boolean;
}
