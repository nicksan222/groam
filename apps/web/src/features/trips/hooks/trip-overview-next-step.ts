// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type NextStep = {
  action: string;
  description: string;
  onClick: () => void;
  title: string;
};

export function nextStepFor({
  hasDestination,
  hasDuration,
  hasTravelWindow,
  onAddDestination,
  onEditDetails,
  onOpenItinerary
}: {
  hasDestination: boolean;
  hasDuration: boolean;
  hasTravelWindow: boolean;
  onAddDestination: () => void;
  onEditDetails: () => void;
  onOpenItinerary: () => void;
}): NextStep {
  if (!hasDestination) {
    return {
      action: 'Add first destination',
      description:
        'Start the route with a real place. Your map and cover will follow automatically.',
      onClick: onAddDestination,
      title: 'Choose where this trip begins'
    };
  }
  if (!hasTravelWindow) {
    return {
      action: 'Add travel window',
      description: 'Give everyone a shared timeframe before the details start filling in.',
      onClick: onEditDetails,
      title: 'When could this trip happen?'
    };
  }
  if (!hasDuration) {
    return {
      action: 'Set trip length',
      description: 'Choose the number of days available for destinations and activities.',
      onClick: () => document.getElementById('trip-length')?.scrollIntoView({ behavior: 'smooth' }),
      title: 'Decide how much time you have'
    };
  }
  return {
    action: 'Build the itinerary',
    description: 'The foundation is set. Add activities and turn the route into a day-by-day plan.',
    onClick: onOpenItinerary,
    title: 'Turn the route into a plan'
  };
}
