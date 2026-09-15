import type { AddActivityAction } from './actions/add-activity';
import type { AddDestinationToIdeaAction } from './actions/add-destination-to-idea';
import type { AddIdeaAction } from './actions/add-idea';
import type { AddIssueCommentAction } from './actions/add-issue-comment';
import type { ApplyIdeaAction } from './actions/apply-idea';
import type { ApproveIdeaAction } from './actions/approve-idea';
import type { ArchiveTripAction } from './actions/archive-trip';
import type { AssignIssueAction } from './actions/assign-issue';
import type { CreateIssueAction } from './actions/create-issue';
import type { CreateTripAction } from './actions/create-trip';
import type { RequestIdeaReviewAction } from './actions/request-idea-review';
import type { RestoreTripAction } from './actions/restore-trip';
import type { SendMessageAction } from './actions/send-message';
import type { SetIssueStatusAction } from './actions/set-issue-status';
import type { UpdateTripAction } from './actions/update-trip';

/** The application capabilities every interaction adapter implements. */
export abstract class AppActions<Actor> {
  abstract readonly addActivity: AddActivityAction<Actor>;
  abstract readonly addDestinationToIdea: AddDestinationToIdeaAction<Actor>;
  abstract readonly addIdea: AddIdeaAction<Actor>;
  abstract readonly addIssueComment: AddIssueCommentAction<Actor>;
  abstract readonly applyIdea: ApplyIdeaAction<Actor>;
  abstract readonly approveIdea: ApproveIdeaAction<Actor>;
  abstract readonly archiveTrip: ArchiveTripAction<Actor>;
  abstract readonly assignIssue: AssignIssueAction<Actor>;
  abstract readonly createIssue: CreateIssueAction<Actor>;
  abstract readonly createTrip: CreateTripAction<Actor>;
  abstract readonly requestIdeaReview: RequestIdeaReviewAction<Actor>;
  abstract readonly restoreTrip: RestoreTripAction<Actor>;
  abstract readonly sendMessage: SendMessageAction<Actor>;
  abstract readonly setIssueStatus: SetIssueStatusAction<Actor>;
  abstract readonly updateTrip: UpdateTripAction<Actor>;
}
