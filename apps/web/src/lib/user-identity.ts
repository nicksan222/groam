export function userIdentityLabel(user: { name: string; username?: null | string }): string {
  return user.username ? `@${user.username}` : user.name;
}
