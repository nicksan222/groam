import { ideaChangesViaIdea } from '@/features/ideas/idea-glossary';

/** Why the shared list is read-only: it changes through an idea, or the trip is archived. */
export function GroupGearFooter({
  archived,
  sharedTrip
}: {
  archived: boolean;
  sharedTrip: boolean;
}) {
  const note = archived
    ? 'This trip is archived, so its gear list is read-only.'
    : sharedTrip
      ? ideaChangesViaIdea
      : null;
  if (!note) return null;
  return <p className="border-t border-border pt-3 text-xs text-muted-foreground">{note}</p>;
}
