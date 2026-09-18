export const usernameRequirements =
  'Use 3–30 letters, numbers, underscores, or dots for your username.';

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_.]{3,30}$/u.test(username);
}
