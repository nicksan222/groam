import type { AppUserProfile } from '@groam/app-actions/backend';
import type { PersonKey } from './seed-types';

const people: ReadonlyArray<{ key: PersonKey; local: string; name: string }> = [
  { key: 'elena', local: 'elena.marchetti', name: 'Elena Marchetti' },
  { key: 'tomas', local: 'tomas.ferreira', name: 'Tomás Ferreira' },
  { key: 'priya', local: 'priya.raman', name: 'Priya Raman' },
  { key: 'daniel', local: 'daniel.okafor', name: 'Daniel Okafor' },
  { key: 'hannah', local: 'hannah.weiss', name: 'Hannah Weiss' }
];

/** The demo owner is Elena, signing in with the configured seed credentials. */
export function buildCast(owner: AppUserProfile): Map<PersonKey, AppUserProfile> {
  const separator = owner.email.lastIndexOf('@');
  const domain = separator > 0 ? owner.email.slice(separator + 1) : 'groam.example';
  return new Map(
    people.map(({ key, local, name }) => [
      key,
      key === 'elena'
        ? { ...owner, name }
        : { email: `${local}@${domain}`, name, password: owner.password }
    ])
  );
}
