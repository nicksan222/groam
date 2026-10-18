import type { AppUserProfile } from '@groam/app-actions/backend';

const firstNames = [
  'Avery',
  'Maya',
  'Noah',
  'Sofia',
  'Theo',
  'Amara',
  'Elias',
  'Zoe',
  'Mateo',
  'Nora',
  'Kai',
  'Leila',
  'Finn',
  'Priya',
  'Jonah',
  'Iris'
];
const lastNames = [
  'Morgan',
  'Patel',
  'Kim',
  'Santos',
  'Okafor',
  'Nguyen',
  'Rivera',
  'Andersen',
  'Haddad',
  'Bennett'
];

function generatedEmail(ownerEmail: string, index: number): string {
  const separator = ownerEmail.lastIndexOf('@');
  const domain = separator > 0 ? ownerEmail.slice(separator + 1) : 'groam.example';
  return `traveler.${String(index).padStart(3, '0')}@${domain}`;
}

export function buildUserProfiles(count: number, owner: AppUserProfile): AppUserProfile[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('User count must be a whole number between 1 and 100');
  }

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return owner;
    const firstName = firstNames[(index - 1) % firstNames.length] ?? 'Traveler';
    const lastName =
      lastNames[Math.floor((index - 1) / firstNames.length) % lastNames.length] ?? 'Member';
    return {
      email: generatedEmail(owner.email, index),
      name: `${firstName} ${lastName}`,
      password: owner.password
    };
  });
}
