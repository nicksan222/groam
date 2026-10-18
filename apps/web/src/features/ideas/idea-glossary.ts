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
export const ideaOverviewTitle = 'The trip with this idea';
export const ideaOverviewDescription =
  'What the whole shared trip becomes once this idea is applied: every day and the route.';

export const ideasListDescription =
  'Make changes in an idea, review them together, then apply the approved result to the shared trip.';
export const ideasListDescriptionShort = ideasListDescription;
export const ideaEmptyHeadline = `Start an ${ideaNoun.toLowerCase()}`;
export const ideaEmptyDescription =
  'Your edits stay in an idea until the group reviews and applies them.';

export function ideaCompareTabLabel(changeCount: number) {
  return `Changes (${changeCount})`;
}

export function existingDraftPrompt(title: string) {
  return `You already have a draft on this trip: ${title}`;
}

export function draftAuthorOnly(authorName: string) {
  return `Draft — only ${authorName} can edit`;
}

const ideaPackingDraftNotice = 'Draft: the group sees these changes once this idea is applied';
export const ideaPackingSeeChanges = 'See changes';

/** The line above an idea's gear list: what state the draft is in and whether it can still be edited. */
export function ideaPackingNotice(status: string, canEdit: boolean): string {
  if (status === 'merged') return 'Applied to the shared trip. This copy is read-only.';
  if (status === 'closed') return 'Closed without applying. This gear list is read-only.';
  if (status === 'conflicted') {
    return 'This idea conflicts with the shared plan, so its gear cannot be applied yet.';
  }
  if (status === 'in_review') {
    return canEdit
      ? 'In review: you can keep editing, and the group sees these changes once this idea is applied.'
      : 'In review: the group sees these changes once this idea is applied.';
  }
  return canEdit
    ? ideaPackingDraftNotice
    : 'Draft: you can read this gear list, but only its author can edit it.';
}
export const ideaChangesViaIdea =
  'Gear changes go through an idea, so everyone can weigh in. You can approve your own.';
