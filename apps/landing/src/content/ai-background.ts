export type BackgroundStep = {
  label: string;
  job: string;
  result: string;
  kind: 'context' | 'web' | 'group' | 'check' | 'draft';
  source?: { label: string; href: string };
};

export const aiBackground = {
  title: 'Let the agent do the digging.',
  body: 'Opening hours. The group’s vote. That evening you don’t want to move. Groam follows the loose ends and brings the findings back to your idea.',
  steps: [
    {
      label: 'Read context',
      job: 'Open the Saturday plan, Sintra draft, and linked train-ticket issue.',
      result: 'Belém is still live. The Sintra change is an unapplied idea.',
      kind: 'context'
    },
    {
      label: 'Check source',
      job: 'Find the official Pena Palace page for opening details.',
      result:
        'Example web check · opening details remain unverified until someone checks the source.',
      kind: 'web',
      source: {
        label: 'Official source to check',
        href: 'https://www.parquesdesintra.pt/en/parks-monuments/park-and-national-palace-of-pena/'
      }
    },
    {
      label: 'Read poll',
      job: 'Collect the existing group choice for the train time.',
      result: 'Example poll · 3 responses prefer the 09:30 train.',
      kind: 'group'
    },
    {
      label: 'Check timing',
      job: 'Test the revised sequence against the fixed evening plan.',
      result:
        '09:30 train → 11:00 palace → 13:30 lunch → 17:30 return → 21:00 fado. No overlap in the draft.',
      kind: 'check'
    },
    {
      label: 'Draft ready',
      job: 'Package the findings into the idea and report back.',
      result:
        'Ready for people to review. The shared plan stays unchanged until a separate, explicit Apply action.',
      kind: 'draft'
    }
  ] satisfies BackgroundStep[]
} as const;
