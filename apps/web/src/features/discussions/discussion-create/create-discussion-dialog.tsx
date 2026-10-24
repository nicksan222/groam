import { MAX_DISCUSSION_TITLE_LENGTH } from '@groam/backend/convex/modules/discussions/threads/lengths';
import type { Id } from '@groam/backend/data-model';
import { Check } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { MenuRow } from '@groam/ui/components/menu-row';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useState } from 'react';
import {
  type DiscussionMember,
  useCreateDiscussion,
  useDiscussionRoster
} from '@/features/discussions/hooks/use-discussions';
import { displayInitials } from '@/lib/display-initials';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CreateDiscussionDialogProps = {
  onClose: () => void;
  onCreated: (discussionId: Id<'discussions'>) => void;
  open: boolean;
  /** Starts the chat in this trip and locks it there; without it the chat belongs to no trip. */
  trip?: { id: Id<'trips'>; name: string };
};

/** Starts a chat; every opening begins with an empty draft and a fresh request id. */
export function CreateDiscussionDialog(props: CreateDiscussionDialogProps) {
  const session = useOpenSession(props.open);
  return <CreateDiscussionForm key={session} {...props} />;
}

function CreateDiscussionForm({ onClose, onCreated, open, trip }: CreateDiscussionDialogProps) {
  const { createDiscussion } = useCreateDiscussion();
  const roster = useDiscussionRoster(trip?.id);
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState('');
  // A trip chat starts with every traveler invited; a group chat starts with no one.
  const [chosenUserIds, setChosenUserIds] = useState<string[] | null>(null);
  const selectedUserIds =
    chosenUserIds ?? (trip ? roster.members.map((member) => member.userId) : []);
  const form = useFormSubmit({ fallbackError: 'Unable to start this chat' });
  const selectedUserIdSet = new Set(selectedUserIds);

  const toggleMember = (member: DiscussionMember) => {
    setChosenUserIds(
      selectedUserIds.includes(member.userId)
        ? selectedUserIds.filter((userId) => userId !== member.userId)
        : [...selectedUserIds, member.userId]
    );
  };

  // Start stays disabled until there is a name and someone to talk to.
  const canStart = title.trim().length > 0 && selectedUserIds.length > 0;

  const submit = form.handle(async () => {
    if (!canStart) return;
    const trimmedTitle = title.trim();

    const discussionId = await createDiscussion({
      clientRequestId,
      memberUserIds: selectedUserIds,
      title: trimmedTitle,
      ...(trip ? { tripId: trip.id } : {})
    });
    if (discussionId) onCreated(discussionId);
    else form.setError('Unable to start this chat');
  });

  return (
    <FormDialog
      description={`Start a shared conversation with people ${trip ? 'on this trip' : 'in your group'}. Mention @groam if you want AI help in the thread.`}
      error={form.error}
      isPending={form.isPending}
      onClose={onClose}
      onSubmit={submit}
      open={open}
      submitDisabled={!canStart}
      submitLabel="Start chat"
      testId={testIds.newChatDialog}
      title="New chat"
    >
      <FormField label="Title" required>
        <Input
          autoFocus
          data-testid={testIds.newChatTitle}
          disabled={form.isPending}
          maxLength={MAX_DISCUSSION_TITLE_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={
            trip
              ? 'e.g. Dinner on day 3, airport pickup'
              : 'e.g. Italy dates, packing list, dinner plans'
          }
          value={title}
        />
      </FormField>
      {trip ? (
        <p className="text-sm text-muted-foreground" data-testid={testIds.newChatTrip}>
          In <span className="font-medium text-foreground">{trip.name}</span>
        </p>
      ) : null}

      <FormSection
        hint={
          selectedUserIds.length === 0
            ? 'Select at least one'
            : `${selectedUserIds.length} selected`
        }
        legend="People"
      >
        {roster.isLoading ? (
          <PageLoading label="Loading members…" />
        ) : roster.members.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {trip
              ? 'No one else has a seat on this trip yet.'
              : 'Invite someone to your group before starting a chat.'}
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
                  disabled={form.isPending}
                  key={member.userId}
                  onClick={() => toggleMember(member)}
                >
                  <span
                    aria-hidden
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                  <Avatar className="size-7">
                    <AvatarImage alt={member.name} src={member.image ?? ''} />
                    <AvatarFallback className="text-[10px]">
                      {displayInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
                </MenuRow>
              );
            })}
          </div>
        )}
      </FormSection>
    </FormDialog>
  );
}
