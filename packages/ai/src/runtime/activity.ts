import { type AssistantCapability, assistantCapabilityReceipt } from '#ai/agents/catalog';
import { isRecord } from '#ai/runtime/context-tag';

export type AssistantToolActivityReceipt = {
  detail?: string;
  id: string;
  label: string;
  version: 1;
};

export function assistantToolActivity(
  capability: AssistantCapability,
  label: string,
  detail?: string
): AssistantToolActivityReceipt {
  return {
    ...(detail !== undefined ? { detail } : {}),
    id: assistantCapabilityReceipt(capability),
    label,
    version: 1
  };
}

export function parseAssistantToolActivity(output: unknown): AssistantToolActivityReceipt | null {
  if (!isRecord(output) || !isRecord(output.activity)) return null;
  const { detail, id, label, version } = output.activity;
  if (
    version !== 1 ||
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    (detail !== undefined && typeof detail !== 'string')
  ) {
    return null;
  }
  return { ...(detail !== undefined ? { detail } : {}), id, label, version };
}
