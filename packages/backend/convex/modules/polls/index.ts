import { PollReads } from '#convex/modules/polls/reads';
import { PollWrites } from '#convex/modules/polls/writes';

/** Group polls and votes. Writes signal poll waits; this module knows nothing about agents' turns. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class Polls {
  static close = PollWrites.close;
  static closeScheduled = PollWrites.closeScheduled;
  static create = PollWrites.create;
  static get = PollReads.get;
  static listForDiscussion = PollReads.listForDiscussion;
  static listForTrip = PollReads.listForTrip;
  static listTurnForTrip = PollReads.listTurnForTrip;
  static remove = PollWrites.remove;
  static retract = PollWrites.retract;
  static vote = PollWrites.vote;
}
