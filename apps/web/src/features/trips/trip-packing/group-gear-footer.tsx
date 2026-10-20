/** Archived lists keep their read-only explanation beside the gear. */
export function GroupGearFooter({ archived }: { archived: boolean }) {
  if (!archived) return null;
  return (
    <p className="text-xs text-muted-foreground">
      This trip is archived, so its gear list is read-only.
    </p>
  );
}
