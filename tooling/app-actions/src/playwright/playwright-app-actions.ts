import type { AddActivityInput } from '#src/actions/add-activity';
import type { AddDestinationToIdeaInput } from '#src/actions/add-destination-to-idea';
import type { AddIdeaInput } from '#src/actions/add-idea';
import type { AddIssueCommentInput } from '#src/actions/add-issue-comment';
import type { ApplyIdeaInput } from '#src/actions/apply-idea';
import type { ApproveIdeaInput } from '#src/actions/approve-idea';
import type { ArchiveTripInput } from '#src/actions/archive-trip';
import type { AssignIssueInput } from '#src/actions/assign-issue';
import type { CreateIssueInput } from '#src/actions/create-issue';
import type { CreateTripInput } from '#src/actions/create-trip';
import type { RequestIdeaReviewInput } from '#src/actions/request-idea-review';
import type { RestoreTripInput } from '#src/actions/restore-trip';
import type { SendMessageInput } from '#src/actions/send-message';
import type { SetIssueStatusInput } from '#src/actions/set-issue-status';
import type { UpdateTripInput } from '#src/actions/update-trip';
import { AppActions } from '#src/app-actions';
import { addActivity } from './actions/add-activity';
import { addDestinationToIdea } from './actions/add-destination-to-idea';
import { addIdea } from './actions/add-idea';
import { addIssueComment } from './actions/add-issue-comment';
import { applyIdeaAction } from './actions/apply-idea';
import { approveIdeaAction } from './actions/approve-idea';
import { archiveTripAction } from './actions/archive-trip';
import { assignIssue } from './actions/assign-issue';
import { createIssue } from './actions/create-issue';
import { createTrip } from './actions/create-trip';
import { requestIdeaReviewAction } from './actions/request-idea-review';
import { restoreTripAction } from './actions/restore-trip';
import { sendMessage } from './actions/send-message';
import { setIssueStatus } from './actions/set-issue-status';
import { updateTrip } from './actions/update-trip';
import type { UiTarget } from './interaction';

export class PlaywrightAppActions extends AppActions<UiTarget> {
  readonly addActivity = (target: UiTarget, input: AddActivityInput) => addActivity(target, input);
  readonly addDestinationToIdea = (target: UiTarget, input: AddDestinationToIdeaInput) =>
    addDestinationToIdea(target, input);
  readonly addIdea = (target: UiTarget, input: AddIdeaInput) => addIdea(target, input);
  readonly addIssueComment = (target: UiTarget, input: AddIssueCommentInput) =>
    addIssueComment(target, input);
  readonly applyIdea = (target: UiTarget, input: ApplyIdeaInput) => applyIdeaAction(target, input);
  readonly approveIdea = (target: UiTarget, input: ApproveIdeaInput) =>
    approveIdeaAction(target, input);
  readonly archiveTrip = (target: UiTarget, input: ArchiveTripInput) =>
    archiveTripAction(target, input);
  readonly assignIssue = (target: UiTarget, input: AssignIssueInput) => assignIssue(target, input);
  readonly createIssue = (target: UiTarget, input: CreateIssueInput) => createIssue(target, input);
  readonly createTrip = (target: UiTarget, input: CreateTripInput) => createTrip(target, input);
  readonly requestIdeaReview = (target: UiTarget, input: RequestIdeaReviewInput) =>
    requestIdeaReviewAction(target, input);
  readonly restoreTrip = (target: UiTarget, input: RestoreTripInput) =>
    restoreTripAction(target, input);
  readonly sendMessage = (target: UiTarget, input: SendMessageInput) => sendMessage(target, input);
  readonly setIssueStatus = (target: UiTarget, input: SetIssueStatusInput) =>
    setIssueStatus(target, input);
  readonly updateTrip = (target: UiTarget, input: UpdateTripInput) => updateTrip(target, input);
}

export function createPlaywrightActions(): PlaywrightAppActions {
  return new PlaywrightAppActions();
}
