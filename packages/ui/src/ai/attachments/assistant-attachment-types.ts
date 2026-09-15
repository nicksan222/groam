import type {
  AssistantContextTag,
  AssistantContextTagKind
} from '@groam/ai-contracts/agents/registry';

export type AssistantAttachmentReference = {
  id: string;
  kind: AssistantContextTagKind;
};

export type AssistantAttachmentOption = AssistantContextTag & {
  description: string;
};

export type AssistantAttachments = {
  catalog: AssistantAttachmentOption[];
  disabled: boolean;
  onChange: (reference: AssistantAttachmentReference, checked: boolean) => void;
  tags: AssistantContextTag[];
};
