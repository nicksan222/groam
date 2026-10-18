import { sintraIdea } from '@/content/example-trip';

// One example idea, followed from proposal to applied change.

/** Proposed shows the first train at 10:30; the review moves it to 09:30. */
export const proposedTrainTime = 'Sat 10:30';

export const ideaChanges = [
  ...sintraIdea.removes.map((change) => ({
    kind: 'remove' as const,
    time: `Sat ${change.time}`,
    label: change.title
  })),
  ...sintraIdea.adds.map((change) => ({
    kind: 'add' as const,
    time: `Sat ${change.time}`,
    label: change.title
  }))
];

export const ideaSteps = [
  {
    title: 'Propose',
    body: 'Maya bundles six edits into one idea. The live plan stays exactly as it was.'
  },
  {
    title: 'Review',
    body: 'The itinerary agent checks what the change affects. Sam asks for an earlier train, Maya revises, and the group approves.'
  },
  {
    title: 'Apply',
    body: 'Maya applies the idea. Saturday moves to Sintra for everyone at once.'
  }
] as const;

/** Card state per step, in the order Propose, Review, Apply. */
export const ideaStates = [
  { chip: 'Proposed', tone: 'chip-idea', foot: 'Proposed Mon 19:12' },
  { chip: 'In review', tone: 'chip-agent', foot: 'Reviewed Tue 12:51' },
  { chip: 'Applied', tone: 'chip-done', foot: `Applied ${sintraIdea.appliedAt}` }
] as const;
