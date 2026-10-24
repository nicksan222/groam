/** "Owner", "Admin", "Member": the role as the menu writes it. */
export function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
