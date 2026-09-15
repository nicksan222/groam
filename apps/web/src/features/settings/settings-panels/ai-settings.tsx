import { aiKeyProviders } from '@groam/ai-contracts/providers/keys';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { PageLoading } from '@groam/ui/components/page-loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { Spinner } from '@groam/ui/components/spinner';
import { KeyRound, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import { useAiSettings } from '@/features/settings/hooks/use-ai-settings';
import { AiSettingsStatus } from '@/features/settings/settings-panels/ai-settings-status';
import {
  SettingsAside,
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout
} from '@/features/settings/settings-shell/settings-panel';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

function providerDescription(configured: boolean, fromEnvironment: boolean) {
  if (fromEnvironment) {
    return 'Groam is already connected for this app. You can optionally save a fallback connection for your group.';
  }
  if (configured) {
    return 'Groam AI is configured. You can change the model without pasting the key again. Switching providers requires a new key.';
  }
  return 'Paste a provider API key so Groam AI can reply. Cloud providers and a local OpenAI-compatible host (Ollama, LM Studio) are supported.';
}

function managementNotice(configured: boolean, fromEnvironment: boolean) {
  if (fromEnvironment) {
    return 'Groam is already connected. Ask a group owner or admin to change the group’s connection.';
  }
  if (configured) {
    return 'Groam AI is configured for this group. Ask a group owner or admin to change the API key.';
  }
  return 'Ask a group owner or admin to add an AI API key in Settings.';
}

export function AiSettings() {
  const {
    canManage,
    canSave,
    configured,
    fromEnvironment,
    draft,
    isLoading,
    baseUrl,
    model,
    preset,
    provider,
    remove,
    save,
    selectProvider,
    updateDraft
  } = useAiSettings();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  if (isLoading) return <PageLoading label="Loading AI settings…" />;

  return (
    <SettingsSplitLayout
      aside={
        <SettingsAside
          animationDelay="70ms"
          description="Your group’s connection is private. Saved keys are protected and used only when the app does not already have a connection."
          icon={Sparkles}
          title="Private to this group"
        />
      }
    >
      <SettingsPanel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">
            Groam helps through chat. See the work it has done for your group.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/agents" data-testid={testIds.navAgents}>
              Background activity
            </Link>
          </Button>
        </div>
        <SettingsPanelHeading
          description={providerDescription(configured, fromEnvironment)}
          icon={KeyRound}
          title="AI provider"
        />
        <AiSettingsStatus
          configured={configured}
          fromEnvironment={fromEnvironment}
          model={model}
          provider={provider}
        />
        {fromEnvironment ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid={testIds.settingsAiEnvironmentNotice}
          >
            Already connected. A group key is optional.
          </p>
        ) : null}
        {canManage ? (
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Provider">
              <Select onValueChange={selectProvider} value={provider}>
                <SelectTrigger className="w-full" data-testid={testIds.settingsAiProvider}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiKeyProviders.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField description={preset.hint} label="API key">
              <Input
                autoComplete="off"
                data-testid={testIds.settingsAiKey}
                disabled={draft.isPending}
                onChange={(event) => updateDraft({ apiKey: event.target.value })}
                placeholder={configured ? '••••••••' : preset.keyPlaceholder}
                type="password"
                value={draft.apiKey}
              />
            </FormField>
            {preset.requiresBaseUrl ? (
              <FormField
                description="Ollama defaults to http://127.0.0.1:11434/v1. LM Studio often uses http://127.0.0.1:1234/v1."
                label="Base URL"
              >
                <Input
                  autoComplete="off"
                  data-testid={testIds.settingsAiBaseUrl}
                  disabled={draft.isPending}
                  onChange={(event) => updateDraft({ baseUrl: event.target.value })}
                  placeholder={preset.baseURL ?? 'http://127.0.0.1:11434/v1'}
                  value={baseUrl}
                />
              </FormField>
            ) : null}
            {preset.webSearch === false ? (
              <p className="text-sm text-muted-foreground">
                Web search is off for this host. Groam can still plan from your trips and notes.
              </p>
            ) : null}
            <FormField
              description={
                preset.defaultModel
                  ? `Leave blank to use ${preset.defaultModel}.`
                  : 'Leave blank to use the provider default.'
              }
              label="Model"
            >
              <Input
                autoComplete="off"
                data-testid={testIds.settingsAiModel}
                disabled={draft.isPending}
                onChange={(event) => updateDraft({ model: event.target.value })}
                placeholder={preset.defaultModel ?? 'Provider default'}
                value={model}
              />
            </FormField>
            <FormFeedback error={draft.error} message={draft.message} />
            <SettingsFooter>
              <Button
                data-testid={testIds.settingsAiRemove}
                disabled={draft.isPending || !configured}
                onClick={() => void remove()}
                type="button"
                variant="outline"
              >
                Remove key
              </Button>
              <Button
                data-testid={testIds.settingsAiSave}
                disabled={draft.isPending || !canSave}
                type="submit"
              >
                {draft.isPending && <Spinner />}
                {draft.apiKey.trim() ? 'Save key' : 'Save'}
              </Button>
            </SettingsFooter>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {managementNotice(configured, fromEnvironment)}
          </p>
        )}
      </SettingsPanel>
    </SettingsSplitLayout>
  );
}
