import { createAssignedToIssueAgent, setAssignee } from '#convex/modules/travel/issues/assign';
import { create, createStarterIssues } from '#convex/modules/travel/issues/create';
import { addComment, setCondition, setDueAt } from '#convex/modules/travel/issues/edit';
import { closeAfterMerge, move } from '#convex/modules/travel/issues/lifecycle';
import { get, list, listWorkspace } from '#convex/modules/travel/issues/present';

/** Planner issues on a trip: create, list, assign, comment, and status. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripIssues {
  static addComment = addComment;
  static create = create;
  static closeAfterMerge = closeAfterMerge;
  static createAssignedToIssueAgent = createAssignedToIssueAgent;
  static createStarterIssues = createStarterIssues;
  static get = get;
  static list = list;
  static listWorkspace = listWorkspace;
  static move = move;
  static setAssignee = setAssignee;
  static setCondition = setCondition;
  static setDueAt = setDueAt;
}
