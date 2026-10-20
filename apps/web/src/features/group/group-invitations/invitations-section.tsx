import { Button } from '@groam/ui/components/button';
import { RecordList } from '@groam/ui/components/record-list';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';
import type { InvitationCode } from '@/types/invitation-codes';

export function InvitationsSection({
  codes,
  onCopy,
  onRevoke,
  pendingId
}: {
  codes: InvitationCode[];
  onCopy: (code: string) => void;
  onRevoke: (invitationCodeId: InvitationCode['id']) => void;
  pendingId: InvitationCode['id'] | null;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const invitations = codes.filter((invitation) =>
    `${invitation.code} ${invitation.role}`.toLowerCase().includes(normalizedQuery)
  );

  if (codes.length === 0) return null;
  return (
    <RecordList
      empty="No invitation codes match your search."
      getKey={(invitation) => invitation.id}
      items={invitations}
      onQueryChange={setQuery}
      query={query}
      resourceLabel={{ plural: 'invitation codes', singular: 'invitation code' }}
      sortOptions={[
        { label: 'Original order', value: 'default' },
        { compare: (a, b) => a.code.localeCompare(b.code), label: 'Code A–Z', value: 'code' },
        { compare: (a, b) => a.role.localeCompare(b.role), label: 'Role', value: 'role' },
        { compare: (a, b) => a.expiresAt - b.expiresAt, label: 'Expiring first', value: 'expiry' }
      ]}
      renderItem={(invitation) => (
        <RecordListItem
          icon={<KeyRound aria-hidden className="text-muted-foreground" />}
          title={
            <Button
              aria-label={`Copy ${invitation.code}`}
              className="inline-flex max-w-full items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => onCopy(invitation.code)}
              unstyled
            >
              <span className="truncate font-mono tracking-wide">{invitation.code}</span>
              <Copy aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          }
          metadata={
            <>
              <RecordListBadge className="capitalize">{invitation.role}</RecordListBadge>
              <span className="truncate">
                Expires{' '}
                <time dateTime={new Date(invitation.expiresAt).toISOString()}>
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </time>
              </span>
            </>
          }
          badges={
            <Button
              className="h-11 px-2 md:h-6 text-xs text-muted-foreground"
              disabled={pendingId === invitation.id}
              onClick={() => onRevoke(invitation.id)}
              size="sm"
              variant="ghost"
            >
              Revoke
            </Button>
          }
        />
      )}
    />
  );
}
