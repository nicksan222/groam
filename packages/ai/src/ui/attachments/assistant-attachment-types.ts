import type { AssistantContextTag, AssistantContextTagKind } from '#ai/agents';

export type AssistantAttachmentReference = {
  id: string;
  kind: AssistantContextTagKind;
};

export type AssistantAttachmentOption = AssistantContextTag & {
  description: string;
};

export type AssistantAttachments = {
  catalog: AssistantAttachmentOption[];
  canLoadMoreCatalog?: boolean;
  isLoadingCatalog?: boolean;
  loadMoreCatalog?: () => void;
  disabled: boolean;
  onChange: (reference: AssistantAttachmentReference, checked: boolean) => void;
  tags: AssistantContextTag[];
};
