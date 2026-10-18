import {
  addActivity,
  addDestinationToIdea,
  applyIdea,
  approveIdea,
  closeGroamAssistant,
  createGroupChat,
  createIssue,
  createTrip,
  filterWorkspaceIdeas,
  inspectIdeaChanges,
  openCurrentPageOn,
  openIssueFromInbox,
  openIssueWithStatus,
  openTripFromList,
  proposeTripDatesForReview,
  reactToChatMessage,
  sendChatMessage,
  setTripDates,
  showGroamAssistantCapabilities,
  showSharedItinerary,
  signInAs,
  startIdeaFromIssue,
  startItineraryIdea,
  submitIdeaForReview,
  watchSharedTrip
} from '@groam/app-actions/playwright';
import { env } from '@groam/env/showcase';
import { defineVideo, perform, shot, solo, split } from '#src/authoring/storyboard';

// Edit this file to change the cast, data, actions, captions, screens or timing.
// @groam/app-actions/playwright owns how users operate Groam; src/ owns presentation.
const tripName = 'Lisbon weekend';
const ideaName = 'Lisbon itinerary';
const place = {
  name: 'Lisbon',
  label: 'Lisbon, Portugal',
  notes: 'Explore Alfama and the riverfront'
};
const walk = 'Walk through Alfama';
const dateIssueTitle = 'Move the trip one day later';
const meeting = '10–12 October is agreed. Shall we meet at the viewpoint at 10:00?';
const answer = 'Yes. I’ll find a café nearby for after the walk.';
const highlights = [
  'Ride Tram 28',
  'Try pastéis in Belém',
  'Visit MAAT',
  'Watch sunset from the miradouro'
] as const;
const dates = {
  proposed: ['2026-10-09', '2026-10-11'],
  agreed: ['2026-10-10', '2026-10-12']
} as const;
const destinationFixtures = [
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-9.136592, 38.707751] },
    properties: {
      name: place.name,
      country: 'Portugal',
      countrycode: 'PT',
      osm_id: 5400890,
      osm_type: 'R',
      osm_value: 'city'
    }
  }
];

export const video = defineVideo(
  {
    id: 'trip-planning-walkthrough',
    actors: {
      organizer: { label: 'Trip organizer', role: 'Creates the trip and proposes dates' },
      traveler: { label: env.memberName, role: 'Plans the route and reviews dates' }
    },
    capture: {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
      format: 'png'
    },
    presentation: {
      title: 'Planning Lisbon together',
      width: 3840,
      height: 2160,
      fps: 60,
      transitionSeconds: 0.4,
      resultHoldSeconds: 2,
      maxIdleSeconds: 0.9
    },
    prepare: async (pages) => {
      await Promise.all([
        signInAs(
          pages.organizer,
          { email: env.ownerEmail, password: env.password },
          { colorScheme: 'dark', destinationFixtures }
        ),
        signInAs(
          pages.traveler,
          { email: env.memberEmail, password: env.password },
          { colorScheme: 'dark', destinationFixtures }
        )
      ]);
    }
  },
  ({ organizer, traveler }) => [
    shot('create', 'Start with a trip', {
      seconds: 13,
      view: solo(organizer),
      subtitle: 'Lisbon weekend · three days',
      steps: [
        perform(organizer, 'Create Lisbon weekend', (user, director) =>
          createTrip(user, { durationDays: 3, name: tripName }).then(() =>
            openCurrentPageOn(director.actor(traveler.id), user)
          )
        )
      ]
    }),
    shot('destination', 'Build an itinerary', {
      seconds: 16,
      view: solo(traveler),
      subtitle: `${traveler.label} starts an idea and adds Lisbon.`,
      steps: [
        perform(traveler, 'Start an itinerary proposal', (user) =>
          startItineraryIdea(user, ideaName)
        ),
        perform(traveler, 'Add Lisbon to the proposal', (user) => addDestinationToIdea(user, place))
      ]
    }),
    shot('activity', 'Add the first plan', {
      seconds: 10,
      view: solo(traveler),
      subtitle: 'A morning walk through Alfama, with a meeting-point note.',
      steps: [
        perform(traveler, 'Add the Alfama walk', (user) =>
          addActivity(user, {
            destination: place.label,
            notes: 'Meet at the viewpoint at 10:00',
            title: walk
          })
        )
      ]
    }),
    shot('submit', 'Send the itinerary for review', {
      seconds: 11,
      view: split(traveler, organizer),
      subtitle: 'The shared trip stays unchanged while the idea is reviewed.',
      steps: [
        perform(traveler, 'Send the proposal for review', (user, director) =>
          submitIdeaForReview(user, director.actor(organizer.id))
        )
      ]
    }),
    shot('open-ideas', 'Browse the group’s open ideas', {
      seconds: 7,
      view: solo(organizer),
      subtitle: 'See each proposal’s trip, author and status in one list.',
      steps: [
        perform(organizer, 'Browse open ideas', (user) =>
          filterWorkspaceIdeas(user, 'Open', [ideaName])
        )
      ]
    }),
    shot('review', 'Open the idea and inspect the changes', {
      seconds: 7,
      view: solo(organizer),
      subtitle: 'Review the proposed destination and activity before approving.',
      steps: [
        perform(organizer, 'Inspect the itinerary changes', (user) =>
          inspectIdeaChanges(user, ideaName, [place.label, walk])
        )
      ]
    }),
    shot('approve', 'Approve another traveler’s idea', {
      seconds: 5,
      view: split(organizer, traveler),
      subtitle: 'The organizer approves Avery’s itinerary.',
      steps: [perform(organizer, 'Approve the proposal', approveIdea)]
    }),
    shot('first-merge', 'Apply the approved itinerary', {
      seconds: 6,
      view: split(organizer, traveler),
      subtitle: 'Avery sees the shared trip update.',
      steps: [
        perform(traveler, 'Watch the shared trip', watchSharedTrip),
        perform(organizer, 'Apply the reviewed proposal', applyIdea),
        perform(organizer, 'Open the shared itinerary together', (user, director) =>
          showSharedItinerary([user, director.actor(traveler.id)], { activity: walk })
        )
      ]
    }),
    shot('ai-review', 'Explore Groam AI on the itinerary', {
      seconds: 9,
      view: solo(organizer),
      subtitle:
        'Screen-aware suggestions and trip context are ready for a focused AI conversation.',
      steps: [
        perform(organizer, 'Explore the screen-aware AI tools', (user) =>
          showGroamAssistantCapabilities(user, {
            attachment: tripName,
            suggestion: 'Review the itinerary'
          })
        )
      ]
    }),
    shot('dates', 'Agree on the first date proposal', {
      seconds: 13,
      view: split(organizer, traveler),
      subtitle: '9–11 October is proposed, approved and applied to the shared trip.',
      steps: [
        perform(organizer, 'Close the assistant', closeGroamAssistant),
        perform(organizer, 'Propose 9–11 October', (user, director) =>
          proposeTripDatesForReview(user, {
            end: dates.proposed[1],
            name: 'October dates',
            reviewer: director.actor(traveler.id),
            start: dates.proposed[0]
          })
        ),
        perform(traveler, 'Approve the initial dates', approveIdea),
        perform(traveler, 'Watch the shared trip', watchSharedTrip),
        perform(organizer, 'Apply the initial dates', applyIdea),
        perform(organizer, 'Open the dated itinerary together', (user, director) =>
          showSharedItinerary([user, director.actor(traveler.id)], {
            activity: walk,
            dateWindow: '9 Oct 2026 – 11 Oct 2026'
          })
        )
      ]
    }),
    shot('date-issue', 'Ask for a plan change with an issue', {
      seconds: 8,
      view: split(traveler, organizer),
      subtitle: 'Avery arrives on the 10th and opens an issue on the shared trip.',
      steps: [
        perform(traveler, 'Create the date issue', (user) =>
          createIssue(user, {
            title: dateIssueTitle,
            body: 'I arrive on the 10th. Please move the trip one day later so everyone can join.'
          })
        ),
        perform(organizer, 'Open the new issue', (user) => openIssueFromInbox(user, dateIssueTitle))
      ]
    }),
    shot('issue-idea', 'Turn the issue into a reviewable idea', {
      seconds: 12,
      view: split(organizer, traveler),
      subtitle: 'The organizer links an idea, moves the dates, and sends it for review.',
      steps: [
        perform(organizer, 'Start an idea from the issue', startIdeaFromIssue),
        perform(organizer, 'Move the trip to 10–12 October', (user) =>
          setTripDates(user, ...dates.agreed)
        ),
        perform(organizer, 'Send the issue fix for review', (user, director) =>
          submitIdeaForReview(user, director.actor(traveler.id))
        )
      ]
    }),
    shot('issue-merge', 'Approve and apply the issue fix', {
      seconds: 8,
      view: split(traveler, organizer),
      subtitle: 'Avery approves the linked idea; the organizer applies it.',
      steps: [
        perform(traveler, 'Approve the issue fix', approveIdea),
        perform(traveler, 'Watch the shared trip', watchSharedTrip),
        perform(organizer, 'Apply the issue fix', applyIdea)
      ]
    }),
    shot('issue-closed', 'See the issue close automatically', {
      seconds: 6,
      view: solo(organizer),
      subtitle: 'Applying the linked idea resolves the original change request.',
      steps: [
        perform(organizer, 'Open the resolved issue', (user) =>
          openIssueWithStatus(user, { status: 'closed', title: dateIssueTitle })
        )
      ]
    }),
    shot('together', 'Check the updated shared itinerary', {
      seconds: 7,
      view: split(organizer, traveler),
      subtitle: 'Both participants now see 10–12 October and the Alfama walk.',
      steps: [
        perform(organizer, 'Check the updated itinerary together', (user, director) =>
          showSharedItinerary([user, director.actor(traveler.id)], {
            activity: walk,
            dateWindow: '10 Oct 2026 – 12 Oct 2026'
          })
        )
      ]
    }),
    shot('settled-ideas', 'Find the settled ideas', {
      seconds: 6,
      view: solo(organizer),
      subtitle: 'Switch the list to Settled to find both applied proposals.',
      steps: [
        perform(organizer, 'Browse settled ideas', (user) =>
          filterWorkspaceIdeas(user, 'Settled', [ideaName, 'October dates'])
        )
      ]
    }),
    shot('chat', 'Start a chat linked to the trip', {
      seconds: 8,
      view: split(organizer, traveler),
      subtitle: 'Add Avery and link the conversation to Lisbon weekend.',
      steps: [
        perform(organizer, 'Start a trip chat', (user, director) =>
          createGroupChat(user, {
            memberName: traveler.label,
            observerPage: director.actor(traveler.id).page,
            title: 'Lisbon meetup',
            tripName
          })
        )
      ]
    }),
    shot('message', 'Agree on a meeting point', {
      seconds: 8,
      view: split(organizer, traveler),
      subtitle: meeting,
      steps: [
        perform(organizer, 'Send the meeting point', (user, director) =>
          sendChatMessage(user, meeting, [director.actor(traveler.id).page])
        )
      ]
    }),
    shot('chat-reply', 'Continue the conversation', {
      seconds: 8,
      view: split(traveler, organizer),
      subtitle: answer,
      steps: [
        perform(traveler, 'Reply with the café plan', (user, director) =>
          sendChatMessage(user, answer, [director.actor(organizer.id).page])
        )
      ]
    }),
    shot('reaction', 'Acknowledge the plan', {
      seconds: 5,
      view: split(organizer, traveler),
      subtitle: 'The message and reaction appear for both participants.',
      steps: [
        perform(organizer, 'Agree with the message', (user, director) =>
          reactToChatMessage(user, answer, 'Agree', [director.actor(traveler.id).page])
        )
      ]
    }),
    shot('return-to-trip', 'Return to the shared trip', {
      seconds: 10,
      view: split(traveler, organizer),
      subtitle: 'Avery starts one more idea after the chat.',
      steps: [
        perform(traveler, 'Open Lisbon weekend', (user) => openTripFromList(user, tripName)),
        perform(traveler, 'Start a highlights proposal', (user) =>
          startItineraryIdea(user, 'More Lisbon highlights')
        )
      ]
    }),
    shot('four-highlights', 'Add four plans in one idea', {
      seconds: 24,
      view: solo(traveler),
      subtitle: 'Transit, food, a museum and sunset arrive as one reviewable proposal.',
      steps: highlights.map((title) =>
        perform(traveler, `Add ${title}`, (user) =>
          addActivity(user, {
            destination: place.label,
            notes: 'Suggested during the Lisbon meetup',
            title
          })
        )
      )
    }),
    shot('third-review', 'Send all four changes for review', {
      seconds: 7,
      view: split(traveler, organizer),
      subtitle: 'The organizer receives the complete proposal immediately.',
      steps: [
        perform(traveler, 'Send all four changes for review', (user, director) =>
          submitIdeaForReview(user, director.actor(organizer.id))
        )
      ]
    }),
    shot('quick-approval', 'Review and approve right away', {
      seconds: 10,
      view: split(organizer, traveler),
      subtitle: 'All four additions are clear, so no revision is needed.',
      steps: [
        perform(organizer, 'Inspect all four changes', (user) =>
          inspectIdeaChanges(user, 'More Lisbon highlights', highlights)
        ),
        perform(organizer, 'Approve the complete proposal', approveIdea)
      ]
    }),
    shot('third-merge', 'Apply the four approved plans', {
      seconds: 7,
      view: split(organizer, traveler),
      subtitle: 'One approval updates the shared itinerary for everyone.',
      steps: [
        perform(traveler, 'Watch the shared trip', watchSharedTrip),
        perform(organizer, 'Apply all four plans', applyIdea)
      ]
    }),
    shot('complete', 'See the completed plan together', {
      seconds: 8,
      view: split(organizer, traveler),
      subtitle: 'The agreed dates, Alfama walk and new highlights are now shared.',
      steps: [
        perform(organizer, 'Open the completed plan together', (user, director) =>
          showSharedItinerary([user, director.actor(traveler.id)], {
            activity: highlights[3],
            dateWindow: '10 Oct 2026 – 12 Oct 2026'
          })
        )
      ]
    })
  ]
);
