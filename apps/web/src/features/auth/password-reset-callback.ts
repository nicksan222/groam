/**
 * Better Auth returns reset links with `auth=reset-password` and a token, or with only an `error`
 * once the link is invalid or expired. Either way the recovery screen handles it, signed in or not.
 */
export function passwordResetCallback(
  search = window.location.search
): { token: string | null } | null {
  const query = new URLSearchParams(search);
  return query.get('auth') === 'reset-password' ? { token: query.get('token') } : null;
}
