const AVATAR_COLORS = [
  'bg-avatar-rosewater text-avatar-rosewater-foreground',
  'bg-avatar-flamingo text-avatar-flamingo-foreground',
  'bg-avatar-pink text-avatar-pink-foreground',
  'bg-avatar-mauve text-avatar-mauve-foreground',
  'bg-avatar-peach text-avatar-peach-foreground',
  'bg-avatar-yellow text-avatar-yellow-foreground',
  'bg-avatar-green text-avatar-green-foreground',
  'bg-avatar-teal text-avatar-teal-foreground',
  'bg-avatar-sky text-avatar-sky-foreground',
  'bg-avatar-sapphire text-avatar-sapphire-foreground',
  'bg-avatar-blue text-avatar-blue-foreground',
  'bg-avatar-lavender text-avatar-lavender-foreground'
];

export function initials(name: string | null | undefined, fallback = ''): string {
  if (!name) return fallback;
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || fallback
  );
}

/** Two-letter initials for display: first+last, or first two letters of a single name. */
export function displayInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (!first) return '?';
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
}

export function avatarClasses(name: string): string {
  const hash = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
  return (
    AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? 'bg-avatar-mauve text-avatar-mauve-foreground'
  );
}
