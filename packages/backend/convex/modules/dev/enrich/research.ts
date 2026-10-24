import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { Research } from '#convex/modules/discussions/research/index';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { insertWithShortId } from '#convex/modules/references/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';

const planningNotes = [
  'We arrive with luggage and would prefer one transfer at most. Keep a taxi fallback in case the train is delayed.',
  'Two travelers are light sleepers. A lift and a quiet street matter more than a rooftop pool; ask the host to confirm access before paying.',
  'Keep one flexible indoor option. Do not prepay every day until we know the forecast.'
];

const plans = [
  {
    label: 'Arrival logistics and rail alternatives',
    effort: 'quick',
    recommendation:
      'Use the direct rail or transit route as the planning baseline, with a door-to-door fallback for a missed last departure. This is an illustrative decision framework; no route or timetable has been verified.',
    comparisons:
      '| Route to compare | Benefit | What could change the decision |\n| --- | --- | --- |\n| Direct rail or transit | Predictable meeting point and fewer road delays | Last departure, luggage restrictions, and lift outages |\n| One-change transit | More potential arrival windows | Connection buffer and carrying bags between platforms |\n| Taxi or prebooked transfer | Door-to-door late-arrival fallback | Full group fare, luggage capacity, cancellation terms |',
    checks: [
      'Confirm every arrival time and the exact terminal or station.',
      'Check the final departure, connection buffer, and step-free route.',
      'Save an offline meeting point and a late-arrival fallback.'
    ],
    uncertainty:
      'Exact routes, departures, luggage rules, accessibility, and total fares still require verification for the travel dates.',
    source: {
      title: 'Seat 61 — independent rail planning reference',
      url: 'https://www.seat61.com/'
    },
    question:
      'Compare airport or station transfers, luggage constraints, last departures, and a fallback for a delayed arrival.'
  },
  {
    label: 'Accessible stays and neighborhood trade-offs',
    effort: 'deep',
    recommendation:
      'Shortlist quiet twin-room options before optimizing for amenities. Request written confirmation of entrance access, lift dimensions, bed configuration, and the cancellation cutoff. No property has been verified in this fixture.',
    comparisons:
      '| Stay profile | Benefit | What could change the decision |\n| --- | --- | --- |\n| Near a direct transit stop | Simpler arrivals and less walking with bags | Street noise and whether the platform-to-room route is step-free |\n| Quiet residential guesthouse | Better sleep and a slower neighborhood pace | Longer transfers, stairs, and late check-in arrangements |\n| Refundable serviced apartment | Shared space and flexibility | Actual twin beds, cleaning charges, deposit, and cancellation deadline |',
    checks: [
      'Confirm twin beds, room locations, and noise exposure with the host.',
      'Request the complete step-free path, including entrance and bathroom details.',
      'Compare the all-in group price and refund deadline in writing.'
    ],
    uncertainty:
      'Room availability, accessibility details, noise levels, fees, and refund terms remain unverified. Listing filters are not a substitute for host confirmation.',
    source: { title: 'Booking.com — accommodation discovery', url: 'https://www.booking.com/' },
    question:
      'Compare quiet neighborhoods with access to transit. Prioritize twin beds, cancellation terms, step-free access, and a realistic total group budget.'
  },
  {
    label: 'Weather backup and opening-hour checks',
    effort: 'standard',
    recommendation:
      'Keep one indoor alternative near the planned route and defer weather-sensitive bookings until cancellation terms and a dated forecast are checked. This simulated run stopped before those checks completed.',
    comparisons:
      '| Backup approach | Benefit | What could change the decision |\n| --- | --- | --- |\n| Flexible museum or indoor visit | Shelter without changing the whole day | Opening day, timed-entry capacity, and coat or bag storage |\n| Neighborhood cafe and covered market | Easy to shorten when the weather improves | Walking distance in rain and actual covered access |\n| Reschedule the outdoor activity | Preserves the original trip priority | Seasonal daylight, remaining slots, and ticket change rules |',
    checks: [
      'Use seasonal patterns only for planning; check a dated forecast closer to departure.',
      'Verify the indoor option’s opening hours and timed-entry rules.',
      'Record the booking-change cutoff and an alternate route for heavy rain or heat.'
    ],
    uncertainty:
      'Forecasts, seasonal hazards, opening hours, ticket inventory, and change policies were not verified. This incomplete fixture must not be treated as a completed safety assessment.',
    source: {
      title: 'World Meteorological Organization — weather services',
      url: 'https://worldweather.wmo.int/'
    },
    question:
      'Check seasonal weather risks, indoor alternatives, opening hours, and ticket cancellation terms. Flag anything requiring confirmation.'
  }
] as const;

export async function enrichResearch(
  ctx: MutationCtx,
  trip: MutableTripCtx,
  targets: {
    destinations: Doc<'tripDestinations'>[];
    stays: Doc<'tripDestinationStays'>[];
    issues: Id<'tripIssues'>[];
    ideaId?: Id<'tripProposals'>;
  }
) {
  let created = 0;
  for (const [index, plan] of plans.entries()) {
    const clientRequestId = `seed-rich-research-v1:${trip.trip._id}:${index}`;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Stable request IDs and short IDs are reserved in order.
    const existing = await ctx.db
      .query('discussions')
      .withIndex('by_organizationId_and_createdBy_userId_and_clientRequestId', (q) =>
        q
          .eq('organizationId', trip.workspace.organizationId)
          .eq('createdBy.userId', trip.workspace.userId)
          .eq('clientRequestId', clientRequestId)
      )
      .unique();
    if (existing) continue;
    const title = plan.label;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Ordered fixture writes.
    const discussionId = await Research.create(ctx, {
      clientRequestId,
      title,
      tripId: trip.trip._id,
      brief: `${plan.question}\n\nFor this trip, traveling in ${trip.trip.currency}. Keep the current itinerary and linked decisions in scope. This is a local demonstration research with illustrative findings, not live verified advice.`
    });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Notes belong to the research created above.
    await Discussions.send(ctx, {
      discussionId,
      clientRequestId: `seed-rich-note-v1:${trip.trip._id}:${index}`,
      text: `Planning note: ${planningNotes[index]}\n\nReference to investigate: ${plan.source.url}\n\nLocal demo note; prices and availability still need verification.`
    });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Link this new research.
    await linkResearch({ ctx, discussionId, targets, index });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Reports belong to this fixture research.
    await seedReport({ ctx, trip, discussionId, plan, failed: index === 2 });
    created += 1;
  }
  return created;
}

async function seedReport({
  ctx,
  trip,
  discussionId,
  plan,
  failed
}: {
  ctx: MutationCtx;
  trip: MutableTripCtx;
  discussionId: Id<'discussions'>;
  plan: (typeof plans)[number];
  failed: boolean;
}) {
  const now = Date.now();
  const report = `> Local demo fixture. No web search or model execution was performed. Sources below are starting points to investigate, not evidence that availability or prices were checked.

## ${plan.label}

### Recommendation
${plan.recommendation}

### Options and trade-offs
${plan.comparisons}

### Before deciding
${plan.checks.map((check, index) => `${index + 1}. ${check}`).join('\n')}

Record verified costs in ${trip.trip.currency}, including fees and the applicable group or per-person split.

### Open questions
${plan.uncertainty}

### Reference
[${plan.source.title}](${plan.source.url})`;
  const runId = await insertWithShortId(ctx, 'agentRuns', {
    agentId: 'researcher',
    createdBy: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    discussionId,
    kickoff: 'assign',
    organizationId: trip.workspace.organizationId,
    researchTask: { effort: plan.effort, topic: plan.question },
    researchResult: { sources: [plan.source], incomplete: failed },
    status: failed ? 'failed' : 'complete',
    surface: 'standalone',
    title: plan.label,
    tripId: trip.trip._id,
    updatedAt: now,
    startedAt: now - 120_000,
    completedAt: now,
    headline: failed ? 'Demo: verification interrupted' : 'Demo: options and next checks prepared',
    report,
    ...(failed
      ? { error: 'Local demo fixture: simulated source timeout. No live request was made.' }
      : {})
  });
  await ctx.db.insert('agentRunEvents', {
    at: now - 120_000,
    kind: 'status',
    label: 'Local demo fixture loaded',
    detail: 'Seeded example only. No tools, web requests, or workflow were executed.',
    organizationId: trip.workspace.organizationId,
    runId,
    seq: 0
  });
  await ctx.db.insert('agentRunEvents', {
    at: now,
    kind: failed ? 'error' : 'report',
    label: failed ? 'Demo verification interrupted' : 'Demo report available',
    detail: 'Illustrative local fixture; rerun research for current evidence.',
    organizationId: trip.workspace.organizationId,
    runId,
    seq: 1,
    ok: !failed
  });
}

async function linkResearch({
  ctx,
  discussionId,
  targets,
  index
}: {
  ctx: MutationCtx;
  discussionId: Id<'discussions'>;
  targets: Parameters<typeof enrichResearch>[2];
  index: number;
}) {
  const issueId = targets.issues[index % targets.issues.length];
  if (issueId) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Link only after creating this research.
    await DiscussionLinks.link(ctx, discussionId, { kind: 'issue', issueId });
  }
  const destination = targets.destinations[index % Math.max(1, targets.destinations.length)];
  if (destination) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Link only after creating this research.
    await DiscussionLinks.link(ctx, discussionId, {
      kind: 'tripTarget',
      target: { type: 'destination', id: destination._id }
    });
  }
  if (index === 1 && targets.stays[0]) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Link only after creating this research.
    await DiscussionLinks.link(ctx, discussionId, {
      kind: 'tripTarget',
      target: { type: 'stay', id: targets.stays[0]._id }
    });
  }
  if (index === 1 && targets.ideaId) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Link only after creating this research.
    await DiscussionLinks.link(ctx, discussionId, { kind: 'idea', proposalId: targets.ideaId });
  }
}
