import { planBefore, saturdayAfter } from '@/content/example-trip';

export type JourneyAuthor = 'Maya' | 'Jonas' | 'Priya' | 'Sam' | 'Trip record';
export type JourneyPlanState = 'unchanged' | 'preview' | 'applied';
export type JourneyChangeLine = { sign: '+' | '−' | '·'; text: string };

export type JourneyStep = {
  tab: string;
  heading: string;
  status: string;
  planState: JourneyPlanState;
  planNote: string;
  messages: { author: JourneyAuthor; text: string }[];
  change: { title: string; lines: JourneyChangeLine[] };
  rows: { time: string; title: string }[];
};

export type ExampleJourney = {
  id: 'home' | 'itinerary' | 'ideas' | 'issues' | 'conversations';
  title: string;
  lede: string;
  steps: JourneyStep[];
};

const saturdayBefore = planBefore.sat.map(({ time, title }) => ({ time, title }));
const saturdayApplied = saturdayAfter.map(({ time, title }) => ({ time, title }));
const fridayWithDinner = planBefore.fri.map(({ time, title }) => ({ time, title }));
const fridayWithoutDinner = fridayWithDinner.filter(({ title }) => title !== 'Dinner in Alfama');
const fridayWithTaxi = [
  { time: '14:20', title: 'Land in Lisbon' },
  { time: '14:45', title: 'Shared taxi from the airport' },
  { time: '15:30', title: 'Check in, Alfama' },
  { time: '20:30', title: 'Dinner in Alfama' }
];
const sundayBefore = planBefore.sun.map(({ time, title }) => ({ time, title }));
const sundayWithMeetingPoint = sundayBefore.map((row) =>
  row.title === 'Brunch at LX Factory'
    ? { ...row, title: 'Brunch at LX Factory · meet at main entrance' }
    : row
);

type StepArguments = [
  tab: string,
  heading: string,
  status: string,
  planState: JourneyPlanState,
  planNote: string,
  messages: JourneyStep['messages'],
  title: string,
  lines: JourneyChangeLine[],
  rows: JourneyStep['rows']
];

const step = (
  ...[tab, heading, status, planState, planNote, messages, title, lines, rows]: StepArguments
): JourneyStep => ({
  tab,
  heading,
  status,
  planState,
  planNote,
  messages,
  change: { title, lines },
  rows
});

const sintraLines: JourneyChangeLine[] = [
  { sign: '−', text: '10:00 Belém walking tour' },
  { sign: '−', text: '13:30 Lunch in Belém' },
  { sign: '+', text: '09:30 Train to Sintra from Rossio' },
  { sign: '+', text: '11:00 Pena Palace, timed entry' },
  { sign: '+', text: '13:30 Lunch in Sintra village' },
  { sign: '+', text: '17:30 Train back to Lisbon' },
  { sign: '·', text: '21:00 Fado night stays put' }
];

export const exampleJourneys: Record<ExampleJourney['id'], ExampleJourney> = {
  home: {
    id: 'home',
    title: 'Watch a plan survive the group chat',
    lede: 'A request changes, gets checked, and lands. Until Maya applies it, Saturday stays exactly as agreed.',
    steps: [
      step(
        'Ask',
        'Maya starts with a rough change',
        'New request',
        'unchanged',
        'Saturday is still the Belém plan.',
        [
          {
            author: 'Maya',
            text: 'What if we swap Belém for Sintra? Maybe a 10:30 train after breakfast.'
          },
          { author: 'Jonas', text: 'If we go, I’d rather have lunch in Sintra too.' },
          { author: 'Priya', text: 'I still want to keep fado at 21:00.' }
        ],
        'Swap Belém for Sintra',
        [
          { sign: '−', text: 'Belém walk and lunch' },
          { sign: '+', text: '10:30 Train to Sintra' },
          { sign: '+', text: 'Pena Palace · time to agree' },
          { sign: '+', text: 'Lunch in Sintra village' },
          { sign: '·', text: 'Return time still to agree' },
          { sign: '·', text: '21:00 Fado night stays put' }
        ],
        saturdayBefore
      ),
      step(
        'Push back',
        'Sam pushes back on the late train',
        'Needs a revision',
        'unchanged',
        'The request is being discussed. The live plan has not moved.',
        [
          { author: 'Maya', text: 'I sketched a 10:30 train, palace, then lunch in the village.' },
          {
            author: 'Sam',
            text: 'No, 10:30 is too late. Make the train 09:30 so the day can breathe.'
          },
          { author: 'Priya', text: 'And give us a clear train back before fado.' },
          { author: 'Maya', text: 'Got it: 09:30 out, proper lunch, early-evening return.' }
        ],
        'Swap Belém for Sintra',
        [
          { sign: '−', text: 'Belém walk and lunch' },
          { sign: '+', text: '09:30 Train to Sintra' },
          { sign: '+', text: 'Pena Palace · time to set' },
          { sign: '+', text: 'Lunch in Sintra village' },
          { sign: '·', text: 'Return before 21:00 fado' }
        ],
        saturdayBefore
      ),
      step(
        'Update',
        'Maya turns it into a real idea',
        'Updated idea',
        'preview',
        'The yellow strip is a preview. Saturday still shows Belém.',
        [
          { author: 'Sam', text: 'Make the train 09:30 so the day can breathe.' },
          { author: 'Maya', text: 'Updated: 09:30 train from Rossio.' },
          { author: 'Maya', text: 'Pena Palace at 11:00, then lunch in the village at 13:30.' },
          { author: 'Maya', text: 'Train back at 17:30.' },
          { author: 'Priya', text: 'Good. That keeps fado at 21:00.' }
        ],
        'Swap Belém for Sintra',
        sintraLines,
        saturdayBefore
      ),
      step(
        'Review',
        'Priya checks the evening',
        'Reviewing',
        'preview',
        'The live plan remains unchanged while the group checks the idea.',
        [
          { author: 'Maya', text: 'The idea now has the full Sintra timetable.' },
          { author: 'Jonas', text: 'Does it replace both the Belém walk and Belém lunch?' },
          { author: 'Maya', text: 'Yes. Those two rows come out together.' },
          { author: 'Priya', text: 'And fado stays at 21:00?' },
          { author: 'Maya', text: 'Yes. We are back at 17:30.' },
          { author: 'Sam', text: '09:30 fixes my timing concern.' }
        ],
        'Swap Belém for Sintra',
        sintraLines,
        saturdayBefore
      ),
      step(
        'Approve',
        'The group is ready',
        '3 approvals',
        'preview',
        'Approved means ready to apply. It is not in the live plan yet.',
        [
          { author: 'Maya', text: 'Final check: 09:30 out, 17:30 back, fado at 21:00.' },
          { author: 'Jonas', text: 'Belém walk and lunch both replaced. Approved.' },
          { author: 'Priya', text: '21:00 fado stays. Approved.' },
          { author: 'Sam', text: '09:30 train works. Approved.' },
          { author: 'Maya', text: 'All three approvals are in.' }
        ],
        'Swap Belém for Sintra',
        sintraLines,
        saturdayBefore
      ),
      step(
        'Apply',
        'Maya applies the agreed change',
        'Applied',
        'applied',
        'Saturday now carries the agreed Sintra times.',
        [
          { author: 'Jonas', text: 'Approved.' },
          { author: 'Priya', text: 'Approved with fado kept at 21:00.' },
          { author: 'Sam', text: 'Approved with the 09:30 train.' },
          { author: 'Maya', text: 'Applying this version.' },
          { author: 'Trip record', text: 'Swap Belém for Sintra was applied by Maya.' },
          { author: 'Trip record', text: 'Saturday’s live plan now shows the Sintra timetable.' }
        ],
        'Swap Belém for Sintra',
        sintraLines,
        saturdayApplied
      ),
      step(
        'Record',
        'The decision stays with the trip',
        'On the record',
        'applied',
        'The plan and the conversation now tell the same story.',
        [
          { author: 'Trip record', text: '10:30 was revised to 09:30 after Sam’s review.' },
          { author: 'Trip record', text: 'Belém walk and lunch were replaced together.' },
          { author: 'Trip record', text: 'Applied Tue 13:05 by Maya.' },
          { author: 'Trip record', text: 'Reviewed by Jonas, Priya, and Sam.' },
          { author: 'Trip record', text: 'Fado night remains Saturday at 21:00.' }
        ],
        'Applied change',
        sintraLines,
        saturdayApplied
      )
    ]
  },
  itinerary: {
    id: 'itinerary',
    title: 'Move the day without losing the night',
    lede: 'The group revises one timing detail, checks the knock-on effects, then updates the shared itinerary once.',
    steps: [
      step(
        'Draft',
        'Maya sketches the Sintra day',
        'Draft request',
        'unchanged',
        'Saturday remains the agreed Belém timetable.',
        [{ author: 'Maya', text: 'Let’s replace Belém with Sintra. Train at 08:00?' }],
        'Saturday timing',
        [{ sign: '+', text: '08:00 Train to Sintra' }],
        saturdayBefore
      ),
      step(
        'Object',
        'Sam says no to the early start',
        'Changes requested',
        'unchanged',
        'Nothing changes while the timing is unsettled.',
        [
          { author: 'Maya', text: 'Let’s replace Belém with Sintra. Train at 08:00?' },
          { author: 'Sam', text: 'Sintra yes. 08:00 no. We will be wrecked after Friday night.' }
        ],
        'Saturday timing',
        [{ sign: '+', text: 'Sintra, with a later start' }],
        saturdayBefore
      ),
      step(
        'Retiming',
        'The trip gets breathing room',
        'Idea updated',
        'preview',
        'The 09:30 version is visible as an idea, beside the untouched plan.',
        [{ author: 'Maya', text: 'Fair. I moved the train to 09:30 and palace entry to 11:00.' }],
        'Saturday timing',
        sintraLines,
        saturdayBefore
      ),
      step(
        'Check',
        'Every connection is reviewed',
        'Route checked',
        'preview',
        'Belém remains live until the whole replacement is applied.',
        [
          { author: 'Priya', text: 'Lunch at 13:30, train back at 17:30, then fado at 21:00?' },
          { author: 'Maya', text: 'Exactly. No overlap.' }
        ],
        'Saturday timing',
        sintraLines,
        saturdayBefore
      ),
      step(
        'Ready',
        'The revised day is approved',
        'Ready to apply',
        'preview',
        'Review is complete. The live timetable is still unchanged.',
        [
          { author: 'Sam', text: 'This version works.' },
          { author: 'Jonas', text: 'Approved.' }
        ],
        'Saturday timing',
        sintraLines,
        saturdayBefore
      ),
      step(
        'Apply',
        'One action rewrites Saturday',
        'Applied',
        'applied',
        'The old Belém rows are replaced together.',
        [
          { author: 'Maya', text: 'Applying the revised Saturday.' },
          { author: 'Trip record', text: 'Saturday itinerary updated.' }
        ],
        'Saturday timing',
        sintraLines,
        saturdayApplied
      ),
      step(
        'History',
        'The timetable keeps its reason',
        'Recorded',
        'applied',
        'Anyone joining later can see what moved and why.',
        [{ author: 'Trip record', text: '08:00 was rejected; 09:30 was approved and applied.' }],
        'Applied itinerary change',
        sintraLines,
        saturdayApplied
      )
    ]
  },
  ideas: {
    id: 'ideas',
    title: 'Turn “dinner somewhere” into an agreed plan',
    lede: 'A vague suggestion becomes a precise idea. Feedback changes it before a single live-plan row moves.',
    steps: [
      step(
        'Suggest',
        'Priya adds Friday dinner',
        'New idea',
        'unchanged',
        'Friday has no dinner row yet.',
        [{ author: 'Priya', text: 'Add dinner near the river at 19:00 on Friday.' }],
        'Add Friday dinner',
        [{ sign: '+', text: '19:00 Dinner near the river' }],
        fridayWithoutDinner
      ),
      step(
        'Push back',
        'Maya protects the arrival day',
        'Changes requested',
        'unchanged',
        'The suggestion stays separate from the live plan.',
        [
          {
            author: 'Maya',
            text: 'Not the river after travel. Can we stay in Alfama and make it later?'
          }
        ],
        'Add Friday dinner',
        [{ sign: '+', text: 'Dinner in Alfama, later' }],
        fridayWithoutDinner
      ),
      step(
        'Revise',
        'Priya updates the idea',
        'Idea updated',
        'preview',
        'The 20:30 row is a proposed strip, not a plan row.',
        [{ author: 'Priya', text: 'Updated: dinner in Alfama at 20:30, after check-in.' }],
        'Add Friday dinner',
        [{ sign: '+', text: '20:30 Dinner in Alfama' }],
        fridayWithoutDinner
      ),
      step(
        'Review',
        'The group checks the exact version',
        'In review',
        'preview',
        'Friday remains unchanged during review.',
        [
          { author: 'Jonas', text: '20:30 gives us time to settle in.' },
          { author: 'Sam', text: 'And we can walk there from the apartment.' }
        ],
        'Add Friday dinner',
        [{ sign: '+', text: '20:30 Dinner in Alfama' }],
        fridayWithoutDinner
      ),
      step(
        'Approve',
        'Everyone agrees on the edit',
        '3 approvals',
        'preview',
        'The idea is approved, but the plan still waits for Apply.',
        [
          { author: 'Maya', text: 'Approved.' },
          { author: 'Jonas', text: 'Approved.' },
          { author: 'Sam', text: 'Approved.' }
        ],
        'Add Friday dinner',
        [{ sign: '+', text: '20:30 Dinner in Alfama' }],
        fridayWithoutDinner
      ),
      step(
        'Apply',
        'The yellow strip presses into Friday',
        'Applied',
        'applied',
        'Dinner is now part of the shared plan.',
        [
          { author: 'Priya', text: 'Applying it.' },
          { author: 'Trip record', text: 'Add Friday dinner was applied by Priya.' }
        ],
        'Add Friday dinner',
        [{ sign: '+', text: '20:30 Dinner in Alfama' }],
        fridayWithDinner
      ),
      step(
        'Record',
        'The exact decision is easy to recover',
        'On the record',
        'applied',
        'Friday and its decision history stay connected.',
        [
          {
            author: 'Trip record',
            text: 'River at 19:00 was revised to Alfama at 20:30 before approval.'
          }
        ],
        'Applied idea',
        [{ sign: '+', text: '20:30 Dinner in Alfama' }],
        fridayWithDinner
      )
    ]
  },
  issues: {
    id: 'issues',
    title: 'Close a loose end by fixing the plan',
    lede: 'The airport transfer issue stays open through discussion and review. Applying its linked idea closes it automatically.',
    steps: [
      step(
        'Open',
        'Sam names the loose end',
        'Issue open',
        'unchanged',
        'The arrival plan still jumps from landing to check-in.',
        [{ author: 'Sam', text: 'Nobody has sorted the airport transfer.' }],
        'Fix airport transfer',
        [{ sign: '+', text: 'Choose a transfer after landing' }],
        fridayWithDinner
      ),
      step(
        'Propose',
        'Jonas suggests the metro',
        'Idea linked',
        'unchanged',
        'A possible fix is linked, but Friday is unchanged.',
        [{ author: 'Jonas', text: 'Let’s take the metro at 14:40.' }],
        'Fix airport transfer',
        [{ sign: '+', text: '14:40 Metro from the airport' }],
        fridayWithDinner
      ),
      step(
        'Push back',
        'Maya catches the luggage problem',
        'Changes requested',
        'unchanged',
        'The issue remains open and the live plan stays put.',
        [{ author: 'Maya', text: 'No metro with four bags and a tight check-in. Shared taxi?' }],
        'Fix airport transfer',
        [{ sign: '+', text: 'Shared taxi after landing' }],
        fridayWithDinner
      ),
      step(
        'Update',
        'The fix gets an exact time',
        'Idea updated',
        'preview',
        'The taxi is visible in the linked idea only.',
        [{ author: 'Jonas', text: 'Updated: shared taxi from the airport at 14:45.' }],
        'Fix airport transfer',
        [{ sign: '+', text: '14:45 Shared taxi from the airport' }],
        fridayWithDinner
      ),
      step(
        'Review',
        'The group checks the handoff',
        'Ready to apply',
        'preview',
        'The issue remains open until its fix lands in the plan.',
        [
          { author: 'Priya', text: 'That leaves 45 minutes to reach the 15:30 check-in.' },
          { author: 'Maya', text: 'Approved.' }
        ],
        'Fix airport transfer',
        [{ sign: '+', text: '14:45 Shared taxi from the airport' }],
        fridayWithDinner
      ),
      step(
        'Apply',
        'The fix lands and the issue closes',
        'Applied · closed',
        'applied',
        'The transfer now fills the gap in Friday’s plan.',
        [
          { author: 'Jonas', text: 'Applying the taxi idea.' },
          { author: 'Trip record', text: 'Airport transfer issue closed automatically.' }
        ],
        'Fix airport transfer',
        [{ sign: '+', text: '14:45 Shared taxi from the airport' }],
        fridayWithTaxi
      ),
      step(
        'Record',
        'The closed issue points to its fix',
        'Closed on the record',
        'applied',
        'The issue, discussion, and final plan row stay linked.',
        [
          {
            author: 'Trip record',
            text: 'Closed by “Shared taxi from the airport”, applied by Jonas.'
          }
        ],
        'Applied fix',
        [{ sign: '+', text: '14:45 Shared taxi from the airport' }],
        fridayWithTaxi
      )
    ]
  },
  conversations: {
    id: 'conversations',
    title: 'Let the conversation change the record',
    lede: 'The group sorts out a meeting point in chat, then carries the agreed detail into the trip instead of losing it above the scroll.',
    steps: [
      step(
        'Ask',
        'Priya asks the practical question',
        'Conversation',
        'unchanged',
        'Sunday still says only “Brunch at LX Factory”.',
        [{ author: 'Priya', text: 'Where exactly are we meeting for brunch on Sunday?' }],
        'Clarify the brunch meeting point',
        [{ sign: '+', text: 'Add a meeting point' }],
        sundayBefore
      ),
      step(
        'Answer',
        'Sam suggests the wrong place',
        'Suggestion',
        'unchanged',
        'Chat has an answer; the plan does not.',
        [
          { author: 'Priya', text: 'Where exactly are we meeting for brunch on Sunday?' },
          { author: 'Sam', text: 'Outside Time Out Market at 11:00?' }
        ],
        'Clarify the brunch meeting point',
        [{ sign: '+', text: '11:00 Time Out Market' }],
        sundayBefore
      ),
      step(
        'Correct',
        'Maya catches the mismatch',
        'Correction',
        'unchanged',
        'The group corrects the chat before creating a change.',
        [
          { author: 'Maya', text: 'No, that is across town. Brunch is at LX Factory.' },
          { author: 'Sam', text: 'Right. Main entrance there, then?' }
        ],
        'Clarify the brunch meeting point',
        [{ sign: '+', text: '11:00 LX Factory main entrance' }],
        sundayBefore
      ),
      step(
        'Capture',
        'The answer becomes an idea',
        'Idea created',
        'preview',
        'The conversation is captured, but Sunday is still untouched.',
        [
          { author: 'Priya', text: 'Made an idea from this: meet at the LX Factory main entrance.' }
        ],
        'Clarify the brunch meeting point',
        [{ sign: '+', text: '11:00 Meet at LX Factory main entrance' }],
        sundayBefore
      ),
      step(
        'Review',
        'Everyone reviews the same wording',
        'Ready to apply',
        'preview',
        'The exact note is approved. It is not live yet.',
        [
          { author: 'Maya', text: 'Clear and easy to find. Approved.' },
          { author: 'Sam', text: 'Approved.' }
        ],
        'Clarify the brunch meeting point',
        [{ sign: '+', text: '11:00 Meet at LX Factory main entrance' }],
        sundayBefore
      ),
      step(
        'Apply',
        'The useful detail leaves the chat',
        'Applied',
        'applied',
        'Sunday now carries the meeting point where everyone will see it.',
        [
          { author: 'Priya', text: 'Applying the meeting point.' },
          { author: 'Trip record', text: 'Brunch meeting point added to Sunday.' }
        ],
        'Clarify the brunch meeting point',
        [{ sign: '+', text: '11:00 Meet at LX Factory main entrance' }],
        sundayWithMeetingPoint
      ),
      step(
        'Record',
        'Later readers get the full context',
        'On the record',
        'applied',
        'The final row links back to the conversation that shaped it.',
        [
          {
            author: 'Trip record',
            text: 'Time Out Market was rejected; LX Factory main entrance was applied.'
          }
        ],
        'Applied conversation change',
        [{ sign: '+', text: '11:00 Meet at LX Factory main entrance' }],
        sundayWithMeetingPoint
      )
    ]
  }
};
