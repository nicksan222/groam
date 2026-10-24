// Copy and example data for /features/ai. Plan data comes from the canonical example trip.
import { exampleTrip, planBefore, sintraIdea, tripIssues } from '@/content/example-trip';

export type ScreenId =
  | 'itinerary'
  | 'ideas'
  | 'issues'
  | 'research'
  | 'polls'
  | 'packing'
  | 'budget'
  | 'setup';

export type Qa = { question: string; answer: string; highlight: string[]; proposal?: boolean };

export type Screen = {
  id: ScreenId;
  label: string;
  context: string;
  rows: { id: string; time?: string; label: string; note?: string }[];
  qas: Qa[];
};

const [tour, lunch, fado] = planBefore.sat;
const [issueDinner, issueTaxi, tickets] = tripIssues;

export const screens: Screen[] = [
  {
    id: 'itinerary',
    label: 'Itinerary',
    context: 'Itinerary \u00b7 Saturday',
    rows: [
      { id: 'tour', time: tour?.time, label: tour?.title ?? '' },
      { id: 'lunch', time: lunch?.time, label: lunch?.title ?? '' },
      { id: 'fado', time: fado?.time, label: fado?.title ?? '' }
    ],
    qas: [
      {
        question: 'Does the Sintra idea clash with anything?',
        answer: sintraIdea.clashCheck,
        highlight: ['tour', 'lunch'],
        proposal: true
      },
      {
        question: 'Does Saturday still work?',
        answer:
          'Nothing overlaps. Lunch at 13:30 is the one fixed point, and Fado night at 21:00 is clear.',
        highlight: ['lunch', 'fado']
      },
      {
        question: 'Move lunch, but keep fado.',
        answer:
          'I can revise the Sintra idea and leave fado untouched. The shared Saturday plan stays as it is until the idea is explicitly applied.',
        highlight: ['lunch', 'fado'],
        proposal: true
      }
    ]
  },
  {
    id: 'ideas',
    label: 'Ideas',
    context: 'Ideas \u00b7 3 open',
    rows: [
      { id: 'sintra', label: sintraIdea.title, note: `by ${sintraIdea.author}` },
      { id: 'dinner', label: issueDinner?.fix ?? '', note: 'Linked to an issue' },
      { id: 'taxi', label: issueTaxi?.fix ?? '', note: 'Linked to an issue' }
    ],
    qas: [
      {
        question: 'What would the Sintra idea change?',
        answer: `It removes the Belém tour and lunch, and adds four stops from the ${sintraIdea.adds[0].time} train to the ${sintraIdea.adds[3].time} train back.`,
        highlight: ['sintra']
      },
      {
        question: 'Can the Idea reviewer check it?',
        answer:
          'Yes. The Idea reviewer can comment, request a blocking change, or approve. It cannot edit or apply the idea, so the live plan stays put.',
        highlight: ['sintra']
      },
      {
        question: 'Apply it when it is ready.',
        answer:
          'Applying remains an explicit action and still has to pass the trip’s rules. I would confirm the result only after that action succeeds.',
        highlight: ['sintra']
      }
    ]
  },
  {
    id: 'issues',
    label: 'Issues',
    context: 'Issues \u00b7 3 open',
    rows: tripIssues.map((issue, n) => ({ id: `issue-${n}`, label: issue.title })),
    qas: [
      {
        question: 'What is still open?',
        answer: 'Three issues. Buying the Saturday train tickets depends on the Sintra idea.',
        highlight: ['issue-0', 'issue-1', 'issue-2']
      },
      {
        question: 'Which issue would the Sintra idea close?',
        answer: `${tickets.title}, once the idea is applied.`,
        highlight: ['issue-2']
      },
      {
        question: 'Give the dinner issue to an agent.',
        answer:
          'The Issue agent can work the assignment into a draft idea and report back. It cannot quietly change the shared trip.',
        highlight: ['issue-0']
      }
    ]
  },
  {
    id: 'research',
    label: 'Research',
    context: 'Research · Sintra day',
    rows: [
      { id: 'research-palace', label: 'Pena Palace entry', note: 'Illustrative saved finding' },
      { id: 'research-train', label: 'Rossio train', note: 'Linked to the Sintra idea' },
      { id: 'research-lunch', label: 'Lunch shortlist', note: '3 saved notes' }
    ],
    qas: [
      {
        question: 'Summarize what we saved.',
        answer:
          'The Researcher can cover the saved palace entry, Rossio train, and three lunch notes, then return a compact recap with the open questions.',
        highlight: ['research-palace', 'research-train', 'research-lunch']
      },
      {
        question: 'Check current hours and prices.',
        answer:
          'I would search the web for current sources, cite what I found, and flag anything the group should verify. This example is not showing live availability.',
        highlight: ['research-palace', 'research-train']
      },
      {
        question: 'Link this to the Sintra idea.',
        answer:
          'I can link the research to the idea so its sources and caveats stay beside the change under review.',
        highlight: ['research-palace', 'research-train']
      }
    ]
  },
  {
    id: 'polls',
    label: 'Polls',
    context: 'Group decisions · Saturday',
    rows: [
      { id: 'poll-sintra', label: 'Sintra or Belém?', note: '3 of 4 answered' },
      { id: 'poll-lunch', label: 'Lunch time', note: 'Waiting for Priya' },
      { id: 'poll-deadline', label: 'Decision deadline', note: 'Friday 18:00' }
    ],
    qas: [
      {
        question: 'Ask everyone which day they prefer.',
        answer:
          'I can create a short group poll instead of guessing, then wait for the result or a sensible deadline before continuing.',
        highlight: ['poll-sintra', 'poll-deadline']
      },
      {
        question: 'What are we waiting for?',
        answer:
          'Priya has not answered the lunch-time poll. The run can pause here and resume when the condition is met or the deadline arrives.',
        highlight: ['poll-lunch', 'poll-deadline']
      }
    ]
  },
  {
    id: 'packing',
    label: 'Packing',
    context: 'Packing · Group and private',
    rows: [
      { id: 'packing-group', label: 'Group rain cover', note: 'Needed · nobody assigned' },
      { id: 'packing-maya', label: 'Phone charger', note: 'My private list · packed' },
      { id: 'packing-tickets', label: 'Train tickets', note: 'Group list · 4 needed' }
    ],
    qas: [
      {
        question: 'Add a rain cover for the group.',
        answer:
          'A group-packing change belongs in an editable idea and reaches the shared trip only when that idea is applied.',
        highlight: ['packing-group']
      },
      {
        question: 'Mark my charger packed.',
        answer:
          'Your private packing list can update live for you. I would not repeat that personal item in a shared conversation.',
        highlight: ['packing-maya']
      },
      {
        question: 'Who is bringing the tickets?',
        answer:
          'The group list says four are needed and nobody is assigned yet. I can ask the group instead of choosing a traveler for them.',
        highlight: ['packing-tickets']
      }
    ]
  },
  {
    id: 'budget',
    label: 'Budget',
    context: 'Budget · Lisbon long weekend',
    rows: [
      { id: 'budget-total', label: 'Trip budget', note: 'Not set' },
      { id: 'budget-costs', label: 'Itemized costs', note: 'None saved yet' },
      { id: 'budget-open', label: 'Sintra tickets', note: 'Open cost question' }
    ],
    qas: [
      {
        question: 'Set a budget for this trip.',
        answer:
          'Tell me the amount and currency. I can put that change into an idea, show it in the recap, and keep the live trip unchanged until apply.',
        highlight: ['budget-total']
      },
      {
        question: 'What costs are missing?',
        answer:
          'No itemized costs are saved yet, and the Sintra tickets are still an open question. I would not invent a total.',
        highlight: ['budget-costs', 'budget-open']
      },
      {
        question: 'Give me a budget recap.',
        answer:
          'I can return a compact recap of verified amounts, missing costs, and the one decision needed next.',
        highlight: ['budget-total', 'budget-costs', 'budget-open']
      }
    ]
  },
  {
    id: 'setup',
    label: 'Trip setup',
    context: 'Trip setup · Lisbon long weekend',
    rows: [
      { id: 'setup-trip', label: 'Lisbon long weekend', note: exampleTrip.dates },
      { id: 'setup-stay', label: 'Stay in Alfama', note: 'Example trip plan' },
      { id: 'setup-transfer', label: 'Airport taxi', note: 'Still an open issue' },
      { id: 'setup-notes', label: 'Dates are flexible', note: 'Trip note' },
      { id: 'setup-rsvp', label: 'Maya · Going', note: 'Personal RSVP' }
    ],
    qas: [
      {
        question: 'Start Lisbon weekend and mark me going.',
        answer:
          'I can create the clearly named trip and set your RSVP when you explicitly ask. Dates and the first plan details can follow.',
        highlight: ['setup-trip', 'setup-rsvp']
      },
      {
        question: 'Add our stay and airport taxi.',
        answer:
          'Once you confirm the stay and transfer details, I can draft them in an idea. Recording them is not the same as booking or paying.',
        highlight: ['setup-stay', 'setup-transfer']
      },
      {
        question: 'Help me fill the missing details.',
        answer:
          'I can ask for the minimum missing information in a compact form, then return a recap before taking the requested action.',
        highlight: ['setup-trip', 'setup-stay', 'setup-transfer', 'setup-notes']
      }
    ]
  }
];

export const steps = { ask: 'You ask', answer: 'Agent answers' } as const;

export const caption =
  'Groam working across the plan, decisions, research, and personal trip tasks.';

export const proposal = {
  label: 'Idea',
  title: sintraIdea.title,
  by: `by ${sintraIdea.author}`
};

export const trip = exampleTrip.name;

export const revisionExample = {
  title: 'A request can take a few rounds.',
  lede: 'The assistant keeps the agreed plan unchanged while the draft is shaped, reviewed, and approved. Applying is its own final action.',
  steps: [
    {
      author: 'Maya',
      label: 'Request',
      text: 'Swap our Belém day for Sintra, but keep fado at 21:00.',
      ideaStatus: 'Listening',
      ideaNote: 'No draft yet.',
      ideaRows: []
    },
    {
      author: 'Groam',
      label: 'Draft idea',
      text: 'I started “Swap Belém for Sintra”: 09:30 train, 10:30 palace, 13:45 lunch, and back at 17:30. Fado stays put.',
      ideaStatus: 'Draft',
      ideaNote: 'Working copy only · shared plan unchanged',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '10:30', title: 'Pena Palace entry', state: 'add' },
        { time: '13:45', title: 'Lunch in Sintra', state: 'add' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    },
    {
      author: 'Maya',
      label: 'Correction',
      text: 'No, keep lunch at 13:30. Move the palace entry to 11:00 instead, and leave fado exactly where it is.',
      ideaStatus: 'Change requested',
      ideaNote: 'Two draft lines marked for revision',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '11:00', title: 'Pena Palace entry', state: 'revised' },
        { time: '13:30', title: 'Lunch in Sintra', state: 'revised' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    },
    {
      author: 'Groam',
      label: 'Revision',
      text: 'Revised: palace at 11:00, lunch at 13:30, train back at 17:30. Fado stays at 21:00. The live plan still has Belém.',
      ideaStatus: 'Revised draft',
      ideaNote: 'Ready to send for review',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '11:00', title: 'Pena Palace entry', state: 'revised' },
        { time: '13:30', title: 'Lunch in Sintra', state: 'revised' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    },
    {
      author: 'Idea reviewer',
      label: 'Review',
      text: 'No overlap. The 17:30 return leaves time before fado. Ready for people to review.',
      ideaStatus: 'Review passed',
      ideaNote: 'No blocking changes requested',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '11:00', title: 'Pena Palace entry', state: 'add' },
        { time: '13:30', title: 'Lunch in Sintra', state: 'add' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    },
    {
      author: 'Jonas & Priya',
      label: 'People approve',
      text: 'Approved. The idea is ready, but Saturday has not changed yet.',
      ideaStatus: '2 approvals',
      ideaNote: 'Ready does not mean applied',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '11:00', title: 'Pena Palace entry', state: 'add' },
        { time: '13:30', title: 'Lunch in Sintra', state: 'add' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    },
    {
      author: 'Maya',
      label: 'Apply',
      text: 'Apply the Sintra idea.',
      ideaStatus: 'Apply requested',
      ideaNote: 'Checking the idea against the shared trip',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '11:00', title: 'Pena Palace entry', state: 'add' },
        { time: '13:30', title: 'Lunch in Sintra', state: 'add' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    },
    {
      author: 'Groam',
      label: 'Applied',
      text: 'Applied. Saturday now shows Sintra, and the linked train-ticket issue can close.',
      ideaStatus: 'Applied',
      ideaNote: 'The shared Saturday plan is now updated',
      ideaRows: [
        { time: '09:30', title: 'Train to Sintra', state: 'add' },
        { time: '11:00', title: 'Pena Palace entry', state: 'add' },
        { time: '13:30', title: 'Lunch in Sintra', state: 'add' },
        { time: '17:30', title: 'Train back to Lisbon', state: 'add' },
        { time: '21:00', title: 'Fado night', state: 'keep' }
      ]
    }
  ]
} as const;
