import { AI_DEMO_NOTICE } from '@groam/ai/backend/errors';
import { Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { PageLoading } from '@groam/ui/components/page-loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useAiSettings } from '@/features/settings/hooks/use-ai-settings';
import {
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';
import { testIds } from '@/lib/test-ids';
import { ChatGptAccount } from './chatgpt-account';

export function AiSettings() {
  const settings = useAiSettings();
  const { remote, connection, isLoading, isPending } = settings;
  if (isLoading || !remote) return <PageLoading label="Loading AI settings…" />;
  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description={
          remote.available
            ? 'Sign in with ChatGPT to authorize eligible AI requests using your plan.'
            : 'AI workflows are disabled in this demo.'
        }
        icon={Sparkles}
        title="ChatGPT"
      />
      <div className="grid gap-6">
        {!remote.available ? <MutedCopy role="status">{AI_DEMO_NOTICE}</MutedCopy> : null}
        <div className="grid gap-4">
          {remote.connections.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium">Your accounts</p>
              {remote.connections.map((account) => (
                <ChatGptAccount
                  key={account.id}
                  account={account}
                  isActive={account.id === remote.activeConnectionId}
                  isPending={isPending}
                  canConnect={remote.available}
                  onConnect={settings.connect}
                  onDisconnect={settings.disconnect}
                  onSelect={settings.selectConnection}
                />
              ))}
            </div>
          ) : null}
          <Button
            className="w-full sm:w-fit"
            variant={connection?.connected ? 'outline' : 'default'}
            data-testid={testIds.settingsAiConnectProvider}
            disabled={isPending || !remote.available}
            onClick={() => void settings.connect()}
            type="button"
          >
            Continue with ChatGPT
          </Button>
        </div>
        {connection?.connected && !remote.planNoticeAcknowledged ? (
          <div
            className="flex flex-col items-start gap-4 bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
            role="note"
          >
            <p className="text-sm leading-relaxed">
              Eligible Groam AI usage counts against your connected ChatGPT plan and its limits. You
              can manage access and usage in ChatGPT settings.
            </p>
            <Button
              disabled={isPending}
              className="shrink-0"
              onClick={() => void settings.acknowledge()}
              size="sm"
              variant="outline"
            >
              Got it
            </Button>
          </div>
        ) : null}
        {connection?.connected && !connection.needsReconnect ? (
          <FormField
            label="Model"
            description={
              settings.modelsLoading
                ? 'Loading models for this ChatGPT account…'
                : 'Models available to your active ChatGPT account.'
            }
          >
            <Select
              disabled={isPending || settings.modelsLoading || settings.models.length === 0}
              onValueChange={(model) => void settings.selectModel(model)}
              value={connection.model ?? ''}
            >
              <SelectTrigger className="w-full" data-testid={testIds.settingsAiModel}>
                <SelectValue placeholder="Choose a model" />
              </SelectTrigger>
              <SelectContent>
                {settings.models.map((model) => (
                  <SelectItem key={model.slug} value={model.slug}>
                    {model.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : null}
        <SettingsFooter>
          <a
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href="https://chatgpt.com/settings/usage"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manage ChatGPT usage
          </a>
        </SettingsFooter>
        <FormFeedback error={settings.error} message={settings.message} />
      </div>
    </SettingsPanel>
  );
}
