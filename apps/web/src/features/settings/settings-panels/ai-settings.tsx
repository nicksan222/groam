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

function providerDescription(
  configured: boolean,
  organizationConfigured: boolean,
  target: 'organization' | 'personal'
) {
  if (configured) {
    return target === 'organization'
      ? 'The shared organization connection is ready. Members may still override it with a personal key.'
      : 'Your personal connection is ready and overrides the organization key. Switching providers requires a new key.';
  }
  if (target === 'organization') {
    return 'Set the shared fallback for organization members who have not connected a personal provider.';
  }
  if (organizationConfigured) {
    return 'Your organization provides an AI connection. Add a personal key only when you want to override it.';
  }
  return 'Use one-click connection when the provider supports it, or paste an API key. Cloud providers and custom OpenAI-compatible endpoints are supported.';
}

export function AiSettings() {
  const {
    canManageOrganization,
    canSave,
    configured,
    environmentConfigured,
    effectiveModel,
    effectiveProvider,
    effectiveSource,
    organizationConfigured,
    draft,
    isLoading,
    baseUrl,
    model,
    preset,
    provider,
    providerConnection,
    remove,
    save,
    selectProvider,
    setTarget,
    target,
    updateDraft
  } = useAiSettings();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  if (isLoading) return <PageLoading label="Loading AI settings…" />;
  if (environmentConfigured) return null;

  return (
    <SettingsSplitLayout
      aside={
        <SettingsAside
          animationDelay="70ms"
          description="A personal key follows your account and overrides the shared organization key. Owners and admins can also manage the shared key."
          icon={Sparkles}
          title={target === 'organization' ? 'Organization connection' : 'Your personal connection'}
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
          description={providerDescription(configured, organizationConfigured, target)}
          icon={KeyRound}
          title={target === 'organization' ? 'Organization AI provider' : 'Personal AI provider'}
        />
        <AiSettingsStatus
          model={effectiveModel}
          provider={effectiveProvider}
          source={effectiveSource}
        />
        {organizationConfigured && target === 'personal' ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid={testIds.settingsAiEnvironmentNotice}
          >
            Organization connection available. Add your own key only if you prefer a personal
            provider.
          </p>
        ) : null}
        <AiSettingsForm
          settings={{
            baseUrl,
            canSave,
            configured,
            draft,
            model,
            preset,
            provider,
            providerConnection,
            remove,
            save,
            selectProvider,
            setTarget,
            target,
            canManageOrganization,
            updateDraft
          }}
          submit={submit}
        />
      </SettingsPanel>
    </SettingsSplitLayout>
  );
}

function AiSettingsForm({
  settings,
  submit
}: {
  settings: Pick<
    ReturnType<typeof useAiSettings>,
    | 'baseUrl'
    | 'canManageOrganization'
    | 'canSave'
    | 'configured'
    | 'draft'
    | 'model'
    | 'preset'
    | 'provider'
    | 'providerConnection'
    | 'remove'
    | 'save'
    | 'selectProvider'
    | 'setTarget'
    | 'target'
    | 'updateDraft'
  >;
  submit: (event: FormEvent) => void;
}) {
  const {
    baseUrl,
    canManageOrganization,
    canSave,
    configured,
    draft,
    model,
    preset,
    provider,
    providerConnection,
    remove,
    selectProvider,
    setTarget,
    target,
    updateDraft
  } = settings;
  return (
    <form className="space-y-4" onSubmit={submit}>
      {canManageOrganization ? (
        <FormField
          description="Personal keys override the organization key."
          label="Connection for"
        >
          <Select onValueChange={setTarget} value={target}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">My account</SelectItem>
              <SelectItem value="organization">Organization members</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      ) : null}
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
      {providerConnection ? (
        <Button
          className="w-full"
          data-testid={testIds.settingsAiConnectProvider}
          disabled={draft.isPending}
          onClick={() => void providerConnection.connect()}
          type="button"
          variant="outline"
        >
          {draft.isPending && <Spinner />}
          {providerConnection.label}
        </Button>
      ) : null}
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
  );
}
