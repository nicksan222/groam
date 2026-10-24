import type { BetterFetch } from '@better-fetch/fetch';

export function accountRecoveryClient() {
  return {
    getActions: ($fetch: BetterFetch) => ({
      accountRecovery: {
        generate: (body: { password: string }) =>
          $fetch<{ codes: string[] }>('/account-recovery/generate', { body, method: 'POST' }),
        resetPassword: (body: { code: string; newPassword: string; username: string }) =>
          $fetch<{ status: boolean }>('/account-recovery/reset-password', {
            body,
            method: 'POST'
          })
      }
    }),
    id: 'account-recovery'
  } as const;
}
