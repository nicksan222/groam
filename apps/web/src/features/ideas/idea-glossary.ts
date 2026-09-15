import type { IdeaStatus } from '@/types/ideas';

export const sharedTripNoun = 'Shared trip';
const ideaNoun = 'Idea';

export const ideaStatusCopy = {
  closed: 'Closed',
  conflicted: 'Needs update',
  draft: 'Draft',
  in_review: 'In review',
  merged: 'Applied'
} as const satisfies Record<IdeaStatus, string>;

export const ideaCreateCta = 'New idea';
export const ideaCreateDialogTitle = 'New idea';
export const ideaCreateSubmit = 'Create idea';
export const ideaCreateDescription =
  'Groam creates an idea from the shared trip. Your edits stay in this idea until they are reviewed and applied.';
export const ideaCreateExplainerAction = 'New idea';
export const ideaCreateExplainerSharedCaption = 'Everyone sees this';
export const ideaCreateExplainerIdeaCaption = 'Edit here';
export const ideaCreateExplainerIdeaLabel = 'Your idea';

export const ideaEditDetails = 'Edit details';
export const ideaSendForReview = 'Send for review';
export const ideaApprove = 'Approve';
export const ideaRemoveApproval = 'Remove approval';
export const ideaApplyToSharedTrip = 'Apply to shared trip';
export const ideaApplyConfirmTitle = 'Apply this idea to the shared trip?';
export const ideaApplyConfirmAction = 'Apply to shared trip';
export const ideaUpdateFromSharedTrip = 'Update from shared trip';
export const ideaChooseWhatToKeep = 'Choose what to keep';
export const ideaKeepSharedTrip = 'Keep shared trip';
export const ideaKeepMyIdea = 'Keep my idea';
export const ideaUpdateConfirm = 'Update idea';
export const ideaDeleteDraft = 'Delete draft';
export const ideaCloseWithoutApplying = 'Close without applying';
export const ideaOpen = 'Open';
export const ideaOpenChanges = 'Open changes';
export const ideaBackToEditing = 'Back to editing';
export const ideaOpenSharedTrip = 'Open shared trip';
export const ideaContinueDraft = 'Continue draft';
export const ideaStartAnother = 'Start another idea';
export const ideaResolveAndApply = 'Resolve and apply';
export const groamReviewLabel = 'Groam review';
export const ideaCompareHeader = 'Shared trip → This idea';

export const ideasListDescription =
  'Make changes in an idea, review them together, then apply the approved result to the shared trip.';
export const ideasListDescriptionShort = ideasListDescription;
export const ideaEmptyHeadline = `Start an ${ideaNoun.toLowerCase()}`;
export const ideaEmptyDescription =
  'Your edits stay in an idea until the group reviews and applies them.';

export const sharedTripBannerTitle = 'Shared trip — read-only';
export const sharedTripBannerDescription = 'Changes are made in ideas and applied after review.';

export function ideaCompareTabLabel(changeCount: number) {
  return `Changes (${changeCount})`;
}

export function ideaOnTripSubtitle(tripName: string) {
  return `Idea on ${tripName}`;
}

export function continueDraftLabel(title: string) {
  return `Continue your draft: ${title}`;
}

export function existingDraftPrompt(title: string) {
  return `You already have a draft on this trip: ${title}`;
}

export function closedWithoutApplying(reason?: string | null) {
  return reason ? `Closed — not applied: ${reason}` : 'Closed — not applied';
}

export function draftAuthorOnly(authorName: string) {
  return `Draft — only ${authorName} can edit`;
}
