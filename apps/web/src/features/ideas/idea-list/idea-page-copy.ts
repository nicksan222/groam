import {
  draftAuthorOnly,
  groamReviewLabel,
  ideaCompareHeader,
  ideaCreateCta,
  ideaCreateDescription,
  ideaCreateDialogTitle,
  ideaCreateExplainerAction,
  ideaCreateExplainerIdeaCaption,
  ideaCreateExplainerIdeaLabel,
  ideaCreateExplainerSharedCaption,
  ideaCreateSubmit,
  ideaEmptyDescription,
  ideaEmptyHeadline,
  ideasListDescription,
  ideasListDescriptionShort,
  sharedTripNoun
} from '@/features/ideas/idea-glossary';
import type { IdeaStatus } from '@/features/ideas/idea-href';

export const startIdeaCta = ideaCreateCta;
export const startIdeaSubmitLabel = ideaCreateSubmit;
export const startIdeaDialogTitle = ideaCreateDialogTitle;
export const startIdeaDialogDescription = ideaCreateDescription;

export { ideaEmptyDescription, ideaEmptyHeadline, ideasListDescription, ideasListDescriptionShort };

export const changeSummaryTitle = ideaCompareHeader;
export const changeSummaryDescription =
  'The shared trip is on the left. This idea is on the right. Review every change before sending it.';

export const reviewersTitle = 'Reviewers';
export const reviewersDescription = `Invite people to approve your changes. ${groamReviewLabel} runs automatically.`;
export const reviewersEmpty = 'Only the idea reviewer so far.';

export const conversationTitle = 'Conversation';

export const nextStepEyebrow = 'What happens next';

export const itineraryDetailsChangeTitle = 'Trip details differ from the shared trip';
export const itineraryDetailsChangeDescription =
  'The shared trip and your idea have different trip details. Choose what to keep.';
export const itineraryDetailsResolveLabel = 'Choose what to keep';

export const ideaCopyExplainerOriginalLabel = sharedTripNoun;
export const ideaCopyExplainerOriginalCaption = ideaCreateExplainerSharedCaption;
export const ideaCopyExplainerCopyLabel = ideaCreateExplainerIdeaLabel;
export const ideaCopyExplainerCopyCaption = ideaCreateExplainerIdeaCaption;
export const ideaCopyExplainerAction = ideaCreateExplainerAction;

export function ideaRowPurpose(status: IdeaStatus, viewerDraft: boolean) {
  if (viewerDraft) return 'Your idea. Edit it, then send it for review.';
  if (status === 'in_review')
    return 'Reviewing changes before they are applied to the shared trip.';
  if (status === 'conflicted')
    return 'The shared trip changed. Update this idea before applying it.';
  if (status === 'draft') return draftAuthorOnly('the author');
  return null;
}

export function ideaDetailNotice(status: IdeaStatus) {
  if (status === 'draft') {
    return {
      ariaLabel: 'Draft workspace',
      description: 'Make changes here, then send them for review. The shared trip stays unchanged.',
      title: 'Draft'
    };
  }
  if (status === 'in_review') {
    return {
      ariaLabel: 'Idea with the group',
      description:
        'Compare the changes, discuss them, and approve the result. The shared trip stays unchanged until this idea is applied.',
      title: 'In review'
    };
  }
  return null;
}

export function ideaWorkspaceNotice({
  authorName,
  canEdit,
  sharedTripName,
  status
}: {
  authorName: string;
  canEdit: boolean;
  sharedTripName?: string;
  status: IdeaStatus;
}) {
  const original = sharedTripName ?? 'the shared trip';
  if (canEdit && status === 'draft') {
    return {
      description: `${original} stays unchanged. Make changes here, then send them for review when ready.`,
      title: 'You’re editing a draft'
    };
  }
  if (canEdit && status === 'in_review') {
    return {
      description: `${original} stays unchanged while the group reviews this idea. Apply it after the required approvals.`,
      title: 'This idea is in review'
    };
  }
  if (canEdit) {
    return {
      description: `Update this idea from the shared trip. ${original} stays unchanged until this idea is applied.`,
      title: 'This idea needs an update'
    };
  }
  if (status === 'draft') {
    return {
      description: `${draftAuthorOnly(authorName)}. ${original} stays unchanged.`,
      title: 'You’re viewing someone else’s idea'
    };
  }
  return {
    description: `Review the proposed changes here. ${original} stays unchanged until the idea is applied.`,
    title: 'You’re viewing someone else’s idea'
  };
}

export function conversationPurpose(status: IdeaStatus, acceptingComments: boolean) {
  if (status === 'draft') {
    return 'Leave notes here. The group will see them after you send this idea for review.';
  }
  if (!acceptingComments) return 'This conversation is closed.';
  return 'Ask questions with a comment, or use Request changes when something must be fixed before this idea can be applied.';
}

export function conversationEmptyBody(acceptingComments: boolean, status: IdeaStatus) {
  if (!acceptingComments) return 'This idea closed without a review conversation.';
  if (status === 'draft') {
    return 'Leave a note, or send this idea for review when you’re ready for the group to talk it through.';
  }
  return 'Ask a question or suggest a change to start the conversation.';
}
