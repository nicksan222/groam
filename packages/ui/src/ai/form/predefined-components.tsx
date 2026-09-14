import { shadcnComponents } from '@json-render/shadcn';
import { AssistantRecap } from '#tsx/ai/form/recap';

/** Non-input rendering strategies available to assistant-generated forms. */
export const assistantDisplayStrategies = {
  Alert: shadcnComponents.Alert,
  Button: shadcnComponents.Button,
  Card: shadcnComponents.Card,
  Heading: shadcnComponents.Heading,
  Recap: AssistantRecap,
  Separator: shadcnComponents.Separator,
  Stack: shadcnComponents.Stack,
  Text: shadcnComponents.Text
} as const;
