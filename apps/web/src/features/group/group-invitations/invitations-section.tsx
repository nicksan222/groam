import { Copy, KeyRound } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { type ReactNode, useMemo, useState } from 'react';
import type { InvitationCode } from '@/types/invitation-codes';

const noun = { plural: 'invitation codes', singular: 'invitation code' };
const sortOptions = [
  { label: 'Original order', value: 'default' },
  { label: 'Code A–Z', value: 'code' },
  { label: 'Role', value: 'role' },
  { label: 'Expiring first', value: 'expiry' }
];

export function InvitationsSection({
  action,
  codes,
  onCopy,
  onRevoke,
  pendingId
}: {
  action?: ReactNode;
  codes: InvitationCode[];
  onCopy: (code: string) => void;
  onRevoke: (invitationCodeId: InvitationCode['id']) => void;
  pendingId: InvitationCode['id'] | null;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('default');
  const normalizedQuery = query.trim().toLowerCase();
  const invitations = useMemo(() => {
    const matching = codes.filter((invitation) =>
      `${invitation.code} ${invitation.role}`.toLowerCase().includes(normalizedQuery)
    );
    if (sort === 'code') return matching.toSorted((a, b) => a.code.localeCompare(b.code));
    if (sort === 'role') return matching.toSorted((a, b) => a.role.localeCompare(b.role));
    if (sort === 'expiry') return matching.toSorted((a, b) => a.expiresAt - b.expiresAt);
    return matching;
  }, [codes, normalizedQuery, sort]);

  if (codes.length === 0) return null;
  return (
    <List bleed={false}>
      <List.Toolbar noun={noun} onQueryChange={setQuery} query={query}>
        <List.Sort noun={noun} onValueChange={setSort} options={sortOptions} value={sort} />
        {action}
      </List.Toolbar>
      <List.Body>
        {invitations.length === 0 ? (
          <List.Empty headline="No invitation codes match your search." icon={KeyRound} />
        ) : (
          <List.Group aria-label="Invitation codes">
            {invitations.map((invitation) => (
              <List.Row key={invitation.id}>
                <List.Icon>
                  <KeyRound aria-hidden className="text-muted-foreground" />
                </List.Icon>
                <List.Main>
                  <List.Title asChild>
                    <Button
                      aria-label={`Copy ${invitation.code}`}
                      className="inline-flex max-w-full items-center gap-2 rounded-sm text-left"
                      onClick={() => onCopy(invitation.code)}
                      unstyled
                    >
                      <span className="truncate font-mono tracking-wide">{invitation.code}</span>
                      <Copy aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    </Button>
                  </List.Title>
                  <List.Description>
                    Expires{' '}
                    <time dateTime={new Date(invitation.expiresAt).toISOString()}>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </time>
                  </List.Description>
                </List.Main>
                <List.Actions>
                  <Badge className="capitalize" variant="outline">
                    {invitation.role}
                  </Badge>
                  <Button
                    className="h-11 px-2 md:h-6 text-xs text-muted-foreground"
                    disabled={pendingId === invitation.id}
                    onClick={() => onRevoke(invitation.id)}
                    size="sm"
                    variant="ghost"
                  >
                    Revoke
                  </Button>
                </List.Actions>
              </List.Row>
            ))}
          </List.Group>
        )}
      </List.Body>
    </List>
  );
}
