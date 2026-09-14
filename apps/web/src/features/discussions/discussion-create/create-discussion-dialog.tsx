import type { Id } from '@groam/backend/data-model';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { MenuRow } from '@groam/ui/components/menu-row';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { Spinner } from '@groam/ui/components/spinner';
import { Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  type DiscussionMember,
  useCreateDiscussion,
  useDiscussionRoster
} from '@/features/discussions/hooks/use-discussions';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { displayInitials } from '@/lib/display-initials';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type CreateDiscussionDialogProps = {
  onClose: () => void;
  onCreated: (discussionId: Id<'discussions'>) => void;
  open: boolean;
};

export function CreateDiscussionDialog({ onClose, onCreated, open }: CreateDiscussionDialogProps) {
  const { createDiscussion } = useCreateDiscussion();
  const roster = useDiscussionRoster();
  const { trips } = useTrips({ includeArchived: false, initialNumItems: 25 });
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState('');
  const [tripId, setTripId] = useState<Id<'trips'> | ''>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submitting = useAsyncPending();
  const selectedUserIdSet = new Set(selectedUserIds);

  const toggleMember = (member: DiscussionMember) => {
    setSelectedUserIds((current) =>
      current.includes(member.userId)
        ? current.filter((userId) => userId !== member.userId)
        : [...current, member.userId]
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give this chat a name.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Invite at least one group member.');
      return;
    }

    setError(null);
    await submitting.run(async () => {
      try {
        const discussionId = await createDiscussion({
          clientRequestId,
          memberUserIds: selectedUserIds,
          title: trimmedTitle,
          ...(tripId ? { tripId } : {})
        });
        if (discussionId) onCreated(discussionId);
        else setError('Unable to start this chat');
      } catch (caught: unknown) {
        setError(errorMessage(caught, 'Unable to start this chat'));
      }
    });
  };

  return (
    <FormDialog
      description="Start a shared conversation with people in your group. Mention @groam if you want AI help in the thread."
      error={error}
      isPending={submitting.isPending}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      open={open}
      submitDisabled={roster.members.length === 0}
      submitLabel="Start chat"
      testId={testIds.newChatDialog}
      title="New chat"
    >
      <FormField label="Title" required>
        <Input
          autoFocus
          data-testid={testIds.newChatTitle}
          disabled={submitting.isPending}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Italy dates, packing list, dinner plans…"
          value={title}
        />
      </FormField>
      {trips.length > 0 ? (
        <FormField label="Linked trip">
          <Select
            disabled={submitting.isPending}
            onValueChange={(value) => setTripId(value === 'none' ? '' : (value as Id<'trips'>))}
            value={tripId === '' ? 'none' : tripId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Optional — e.g. Paris lodging" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No trip</SelectItem>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">People</p>
          <p className="text-xs text-muted-foreground">
            {selectedUserIds.length === 0
              ? 'Select at least one'
              : `${selectedUserIds.length} selected`}
          </p>
        </div>
        {roster.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner /> Loading members…
          </div>
        ) : roster.members.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Invite someone to your group before starting a chat.
          </p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
            {roster.members.map((member) => {
              const selected = selectedUserIdSet.has(member.userId);
              return (
                <MenuRow
                  aria-pressed={selected}
                  data-member-name={member.name}
                  data-testid={testIds.chatMember}
                  density="popover"
                  disabled={submitting.isPending}
                  key={member.userId}
                  onClick={() => toggleMember(member)}
                >
                  <Avatar className="size-7">
                    <AvatarImage alt={member.name} src={member.image ?? ''} />
                    <AvatarFallback className="text-[10px]">
                      {displayInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
                  {selected && <Check className="size-4 text-primary" />}
                </MenuRow>
              );
            })}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
