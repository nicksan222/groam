import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';

export function useAiAvailability() {
  const settings = useQuery(api.routes.settings.ai.get.run, {});
  return {
    environmentConfigured: settings?.environmentConfigured ?? false,
    hideAi: settings === undefined || settings.environmentConfigured,
    isLoading: settings === undefined
  };
}
