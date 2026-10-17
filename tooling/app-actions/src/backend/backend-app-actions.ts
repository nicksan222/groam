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
import { addActivity } from './add-activity';
import { addDestinationToIdea } from './add-destination-to-idea';
import { addIdea, startIdea } from './add-idea';
import { addIssueComment } from './add-issue-comment';
import { applyIdea } from './apply-idea';
import { approveIdea } from './approve-idea';
import { archiveTrip } from './archive-trip';
import { assignIssue } from './assign-issue';
import { type BackendActionsConfig, BackendSession } from './backend-session';
import { createIssue } from './create-issue';
import { createTrip } from './create-trip';
import { type CreateTripPlan, createTrips } from './create-trips';
import { type AppUserProfile, type AuthenticatedAppUser, ensureUser } from './ensure-user';
import { type AppWorkspace, type EnsureWorkspaceInput, ensureWorkspace } from './ensure-workspace';
import { findIdea } from './find-idea';
import { getConvexToken } from './get-convex-token';
import { createInvitation, redeemInvitation } from './invitations';
import { joinWorkspace } from './join-workspace';
import { listWorkspaceMemberIds } from './list-workspace-member-ids';
import { requestIdeaReview } from './request-idea-review';
import {
  type CreateResearchInput,
  createResearch,
  findTripResearchTargets,
  linkResearch,
  postResearchMessage,
  type ResearchLinkTarget
} from './research';
import { resetLocalDevelopmentData } from './reset-local-development-data';
import { restoreTrip } from './restore-trip';
import { sendMessage } from './send-message';
import { setIssueStatus } from './set-issue-status';
import { updateTrip } from './update-trip';

export class BackendAppActions extends AppActions<AuthenticatedAppUser> {
  private readonly backend: BackendSession;

  constructor(config: BackendActionsConfig) {
    super();
    this.backend = new BackendSession(config);
  }

  readonly addActivity = (user: AuthenticatedAppUser, input: AddActivityInput) =>
    addActivity({ backend: this.backend, user }, input);
  readonly addDestinationToIdea = (user: AuthenticatedAppUser, input: AddDestinationToIdeaInput) =>
    addDestinationToIdea({ backend: this.backend, user }, input);
  readonly addIdea = (user: AuthenticatedAppUser, input: AddIdeaInput) =>
    addIdea({ backend: this.backend, user }, input);
  readonly addIssueComment = (user: AuthenticatedAppUser, input: AddIssueCommentInput) =>
    addIssueComment({ backend: this.backend, user }, input);
  readonly applyIdea = (user: AuthenticatedAppUser, input: ApplyIdeaInput) =>
    applyIdea({ backend: this.backend, user }, input);
  readonly approveIdea = (user: AuthenticatedAppUser, input: ApproveIdeaInput) =>
    approveIdea({ backend: this.backend, user }, input);
  readonly archiveTrip = (user: AuthenticatedAppUser, input: ArchiveTripInput) =>
    archiveTrip({ backend: this.backend, user }, input);
  readonly assignIssue = (user: AuthenticatedAppUser, input: AssignIssueInput) =>
    assignIssue({ backend: this.backend, user }, input);
  readonly createIssue = (user: AuthenticatedAppUser, input: CreateIssueInput) =>
    createIssue({ backend: this.backend, user }, input);
  readonly createTrip = (user: AuthenticatedAppUser, input: CreateTripInput) =>
    createTrip({ backend: this.backend, user }, input);
  readonly createTrips = (user: AuthenticatedAppUser, plans: readonly CreateTripPlan[]) =>
    createTrips(this.backend, user, plans);
  readonly requestIdeaReview = (user: AuthenticatedAppUser, input: RequestIdeaReviewInput) =>
    requestIdeaReview({ backend: this.backend, user }, input);
  readonly restoreTrip = (user: AuthenticatedAppUser, input: RestoreTripInput) =>
    restoreTrip({ backend: this.backend, user }, input);
  readonly sendMessage = (user: AuthenticatedAppUser, input: SendMessageInput) =>
    sendMessage({ backend: this.backend, user }, input);
  readonly setIssueStatus = (user: AuthenticatedAppUser, input: SetIssueStatusInput) =>
    setIssueStatus({ backend: this.backend, user }, input);
  readonly startIdea = (user: AuthenticatedAppUser, input: AddIdeaInput) =>
    startIdea({ backend: this.backend, user }, input);
  readonly updateTrip = (user: AuthenticatedAppUser, input: UpdateTripInput) =>
    updateTrip({ backend: this.backend, user }, input);

  createResearch(user: AuthenticatedAppUser, input: CreateResearchInput) {
    return createResearch({ backend: this.backend, user }, input);
  }
  linkResearch(
    user: AuthenticatedAppUser,
    input: { discussionId: string; target: ResearchLinkTarget }
  ) {
    return linkResearch({ backend: this.backend, user }, input);
  }
  postResearchMessage(
    user: AuthenticatedAppUser,
    input: { clientRequestId: string; discussionId: string; text: string }
  ) {
    return postResearchMessage({ backend: this.backend, user }, input);
  }
  findTripResearchTargets(user: AuthenticatedAppUser, input: { tripId: string }) {
    return findTripResearchTargets({ backend: this.backend, user }, input);
  }
  resetLocalDevelopmentData() {
    return resetLocalDevelopmentData(this.backend.config.convexUrl);
  }
  ensureUser(profile: AppUserProfile) {
    return ensureUser(this.backend, profile);
  }
  ensureWorkspace(owner: AuthenticatedAppUser, input: EnsureWorkspaceInput) {
    return ensureWorkspace(this.backend, owner, input);
  }
  createInvitation(user: AuthenticatedAppUser, role?: 'admin' | 'member') {
    return createInvitation({ backend: this.backend, user }, role);
  }
  findIdea(user: AuthenticatedAppUser, input: { name: string; tripId: string }) {
    return findIdea({ backend: this.backend, user }, input);
  }
  redeemInvitation(user: AuthenticatedAppUser, code: string) {
    return redeemInvitation({ backend: this.backend, user }, code);
  }
  getConvexToken(user: AuthenticatedAppUser) {
    return getConvexToken(this.backend, user);
  }
  joinWorkspace(
    owner: AuthenticatedAppUser,
    member: AuthenticatedAppUser,
    workspace: AppWorkspace,
    isMember: boolean
  ) {
    return joinWorkspace(this.backend, { isMember, member, owner, workspace });
  }
  listWorkspaceMemberIds(owner: AuthenticatedAppUser, organizationId: string) {
    return listWorkspaceMemberIds(this.backend, owner, organizationId);
  }
}

export function createBackendActions(config: BackendActionsConfig): BackendAppActions {
  return new BackendAppActions(config);
}
