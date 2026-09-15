import type { Id } from '@groam/backend/data-model';
import { useNavigate } from '@tanstack/react-router';
import { ideaListHref } from '@/features/ideas/idea-href';
import type { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { ApplyIdeaDialog } from '@/features/trips/trip-versions/apply-idea-dialog';
import { PassOnIdea } from '@/features/trips/trip-versions/pass-on-idea';
import type { ProposalActionRunner, ProposalDetail } from '@/types/trips';

export function IdeaCloneLifecycleDialogs({
  closingOpen,
  confirmingApply,
  pendingAction,
  proposal,
  run,
  setClosingOpen,
  setConfirmingApply,
  sharedTripId,
  version
}: {
  closingOpen: boolean;
  confirmingApply: boolean;
  pendingAction: string | null;
  proposal: ProposalDetail | null | undefined;
  run: ProposalActionRunner;
  setClosingOpen: (open: boolean) => void;
  setConfirmingApply: (open: boolean) => void;
  sharedTripId: Id<'trips'>;
  version: ReturnType<typeof useTripVersion>;
}) {
  const navigate = useNavigate();
  return (
    <>
      {version.proposal?.canClose ? (
        <PassOnIdea
          close={version.close}
          hideTrigger
          onClosed={() => {
            void navigate(ideaListHref(sharedTripId));
          }}
          onOpenChange={setClosingOpen}
          open={closingOpen}
          pendingAction={pendingAction}
          proposal={version.proposal}
          run={run}
        />
      ) : null}
      {proposal ? (
        <ApplyIdeaDialog
          onApply={() =>
            run('merge', async () => {
              const ok = await version.merge();
              if (ok) {
                void navigate({
                  params: { section: 'overview', tripId: sharedTripId },
                  search: {},
                  to: '/trips/$tripId/$section'
                });
              }
              return ok;
            })
          }
          onOpenChange={setConfirmingApply}
          open={confirmingApply}
          pending={pendingAction === 'merge'}
        />
      ) : null}
    </>
  );
}
