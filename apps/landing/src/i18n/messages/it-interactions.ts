export const interactionRuntimeKeys = [
  'Fri {time}',
  '{count} reply',
  '{count} replies',
  'React to {name}’s message',
  '{names} reacted with {reaction}',
  'React',
  'Reply',
  'You',
  'a thumbs-up',
  'a heart',
  'a cheer',
  'Who wants the 09:30 train?',
  'Me. I’ll meet you at Rossio.',
  'Pena Palace is timed. I booked 11:00 for four.',
  'Lunch before or after the palace?',
  'After. The village at 13:30.',
  'The train back is 17:30, so there’s time before fado.',
  'Play the chat',
  'Pause the chat'
] as const;

export default {
  You: 'Tu',
  'Play the chat': 'Riprendi la chat'
} satisfies Record<string, string>;
