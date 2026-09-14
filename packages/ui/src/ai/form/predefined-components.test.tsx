import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { AssistantRecap } from '#tsx/ai/form/recap';
import { assistantDisplayStrategies } from './predefined-components';

test('registers every predefined non-input component strategy', () => {
  expect(assistantDisplayStrategies).toEqual({
    Alert: shadcnComponents.Alert,
    Button: shadcnComponents.Button,
    Card: shadcnComponents.Card,
    Heading: shadcnComponents.Heading,
    Recap: AssistantRecap,
    Separator: shadcnComponents.Separator,
    Stack: shadcnComponents.Stack,
    Text: shadcnComponents.Text
  });
});
