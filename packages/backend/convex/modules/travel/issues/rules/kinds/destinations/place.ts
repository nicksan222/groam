import { v } from 'convex/values';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { presence, requiredText } from '#convex/modules/travel/issues/rules/helpers';

export const destinationNamed = defineClauseKind({
  args: { text: v.string() },
  category: 'destinations',
  check: ({ text }, { destinations }) => {
    const needle = text.toLowerCase();
    return presence(
      destinations.some(({ name }) => name.toLowerCase().includes(needle)),
      'Not on the route yet'
    );
  },
  create: () => ({ text: '' }),
  description: 'A specific place is on the route.',
  fields: [{ key: 'text', label: 'Place', placeholder: 'Lisbon', type: 'text' }],
  kind: 'destination_named',
  label: ({ text }) => `The route includes “${text}”`,
  needs: ['destinations'],
  normalize: ({ text }) => ({ text: requiredText(text, 'Place') }),
  title: 'Route includes a place'
});
