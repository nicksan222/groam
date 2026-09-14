import { assistantFormCatalog } from '@groam/ai-contracts/output';
import type { Spec } from '@json-render/core';
import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { Check, SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { assistantComponentStrategies } from '#src/ai/shared/assistant-component-strategies';

const { registry } = defineRegistry(assistantFormCatalog, {
  actions: {
    submitForm: () => Promise.resolve()
  },
  components: assistantComponentStrategies
});

type SubmissionState = 'idle' | 'sending' | 'sent';

export function AssistantGeneratedForm({
  disabled,
  isStreaming,
  onReply,
  spec,
  submitted = false,
  submittedValues
}: {
  disabled: boolean;
  isStreaming: boolean;
  onReply: (prompt: string) => Promise<boolean>;
  spec: Spec | null;
  submitted?: boolean;
  submittedValues?: Record<string, unknown>;
}) {
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  const effectiveSubmission = submitted ? 'sent' : submission;

  if (!spec) {
    return isStreaming ? <GeneratedFormSkeleton /> : null;
  }

  const submitForm = async (params: Record<string, unknown>) => {
    if (disabled || effectiveSubmission !== 'idle') return;
    setSubmission('sending');
    const sent = await onReply(formResponsePrompt(params.values));
    setSubmission(sent ? 'sent' : 'idle');
  };
  const initialState = submittedValues
    ? { ...spec.state, form: submittedValues }
    : (spec.state ?? {});
  const stateKey = JSON.stringify(initialState);
  const interactionDisabled = disabled || effectiveSubmission !== 'idle';

  return (
    <div
      aria-busy={effectiveSubmission === 'sending'}
      className={`assistant-generated-form mt-3 min-w-0 whitespace-normal ${interactionDisabled ? 'is-disabled' : ''}`}
    >
      <div className={interactionDisabled ? 'pointer-events-none' : undefined}>
        <JSONUIProvider
          handlers={{ submitForm }}
          initialState={initialState}
          key={stateKey}
          registry={registry}
        >
          <Renderer loading={isStreaming} registry={registry} spec={spec} />
        </JSONUIProvider>
      </div>
      {effectiveSubmission === 'sending' && (
        <p className="shimmer mt-2 flex items-center gap-1.5 rounded-lg bg-muted/35 px-2.5 py-2 text-xs font-medium text-muted-foreground">
          <SendHorizontal className="size-3" /> Sending your answers
        </p>
      )}
      {effectiveSubmission === 'sent' && (
        <p
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-muted/35 px-2.5 py-2 text-xs font-medium text-foreground"
          role="status"
        >
          <Check className="size-3.5" /> Answers saved in this AI chat
        </p>
      )}
    </div>
  );
}

function GeneratedFormSkeleton() {
  return (
    <div
      aria-label="Building an interactive form"
      className="mt-3 space-y-3 rounded-xl border border-border bg-card p-3 shadow-xs/5"
      role="status"
    >
      <span className="block h-4 w-2/5 rounded-full bg-muted" />
      <span className="block h-3 w-4/5 rounded-full bg-muted/70" />
      <span className="block h-1 w-full rounded-full bg-muted/50" />
      <span className="block h-9 rounded-lg border border-input bg-background" />
      <span className="block h-9 rounded-lg border border-input bg-background" />
    </div>
  );
}

function formResponsePrompt(values: unknown): string {
  const normalized = isRecord(values) ? values : {};
  const serialized = JSON.stringify(normalized, null, 2);
  const response = serialized.length > 640 ? `${serialized.slice(0, 637)}…` : serialized;
  return `Here are my form responses:\n${response}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
