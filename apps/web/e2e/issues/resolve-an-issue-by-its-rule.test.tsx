import {
  addIdea,
  applyIdea,
  arrange,
  by,
  createIssue,
  expectIssueInLane,
  expectRuleCondition,
  expectRuleMet,
  ids,
  openIdeaFromList,
  openIssue,
  openTripBoard,
  presentAttribute,
  requestIdeaReview,
  setMyTripRsvp,
  uniqueSuffix,
  updateTrip
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openApp } from '@/journeys/open-app';

const travelersGoing = 'At least 2 travelers are going';
const hasLength = 'The trip has a length';
const hasBudget = 'The trip has a group budget';

async function expectIssueStatus(status: 'closed' | 'open'): Promise<void> {
  await expect.element(by(ids.issueStatus)).toHaveAttribute('data-status', status);
}

test('an issue with a nested "Done when" rule resolves and reopens as the shared trip changes', async () => {
  const suffix = uniqueSuffix();
  const title = `Ready to book ${suffix}`;
  const member = await arrange.addMember('rule');
  const tripId = await arrange.createTrip({ name: `Rule trip ${suffix}` });
  await openApp();
  await openTripBoard(tripId);
  // Two of us are on the trip; I step out before the rule exists, so nothing holds yet.
  await setMyTripRsvp('not_going');

  // Done when: at least 2 travelers are going AND (the trip has a length OR a budget).
  const issueId = await createIssue({
    body: 'Book once enough of us are going and we know how long or how much.',
    rule: {
      items: ['Travelers going', { group: ['Length is set', 'Budget is set'], match: 'any' }],
      match: 'all'
    },
    title
  });
  await expectIssueStatus('open');
  await expectRuleMet(false);
  await expectRuleCondition(travelersGoing, false);
  await expectRuleCondition(hasLength, false);
  await expectRuleCondition(hasBudget, false);
  await expect.element(by(ids.issueConditionGroup)).toHaveAttribute('data-met', 'false');
  await openTripBoard(tripId);
  await expectIssueInLane(title, 'open');

  // Part of the rule: I am going again, but the trip still has no length or budget.
  await setMyTripRsvp('going');
  await expectIssueInLane(title, 'open');
  await openIssue(issueId);
  await expectRuleCondition(travelersGoing, true);
  await expectRuleCondition(hasLength, false);
  await expect.element(by(ids.issueConditionGroup)).toHaveAttribute('data-met', 'false');
  await expectRuleMet(false);
  await expectIssueStatus('open');

  // The rest: an approved idea gives the shared trip a length, which satisfies the "any" group.
  await openTripBoard(tripId);
  await addIdea({ name: `Five days ${suffix}` });
  const ideaName = await presentAttribute(by(ids.ideaWorkspace), 'data-idea-name');
  await updateTrip({ durationDays: 5 });
  await requestIdeaReview();
  await arrange.approveIdea({ ideaName, memberEmail: member.email, tripId });
  await openIdeaFromList({ name: ideaName }, 'view');
  await applyIdea();

  await openIssue(issueId);
  await expectIssueStatus('closed');
  await expectRuleMet(true);
  await expectRuleCondition(travelersGoing, true);
  await expectRuleCondition(hasLength, true);
  await expectRuleCondition(hasBudget, false);
  await expect.element(by(ids.issueConditionGroup)).toHaveAttribute('data-met', 'true');
  await expect
    .element(by(ids.issueAutoStatusEvent).first())
    .toHaveAttribute('data-change', 'resolved');
  await openTripBoard(tripId);
  await expectIssueInLane(title, 'closed');

  // Breaking a clause again reopens it: I drop out, so only one traveler is going.
  await setMyTripRsvp('not_going');
  await expectIssueInLane(title, 'open');
  await openIssue(issueId);
  await expectIssueStatus('open');
  await expectRuleMet(false);
  await expectRuleCondition(travelersGoing, false);
  await expectRuleCondition(hasLength, true);
  await expect
    .element(by(ids.issueAutoStatusEvent).last())
    .toHaveAttribute('data-change', 'reopened');
});
