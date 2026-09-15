import type { UIMessage } from '@convex-dev/agent/react';
import type { ReactNode } from 'react';
import type { AssistantChoice } from '#tsx/ai/tool-calls/assistant-choice-receipt';

export type ToolPart = UIMessage['parts'][number];
export type ToolStatus = 'complete' | 'error' | 'running';

export type ActivityPresentation = {
  detail?: string;
  key: string;
  kind: 'activity';
  label: string;
  semanticId: string;
  status: ToolStatus;
};

export type ChoicePresentation = AssistantChoice & {
  key: string;
  kind: 'choice';
};

export type ToolPresentation = ActivityPresentation | ChoicePresentation;

export type ToolCallComponentProps = {
  disabled: boolean;
  onReply?: (prompt: string) => Promise<boolean>;
  presentation: ToolPresentation;
  selectedChoices?: Record<string, string>;
};

export type ToolCallStrategy = {
  Component: (props: ToolCallComponentProps) => ReactNode;
  present: (part: ToolPart, toolName: string) => ToolPresentation | null;
};
