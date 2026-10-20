import { Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
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
  SettingsAside,
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout
} from '@/features/settings/settings-shell/settings-panel';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { ChatGptAccount } from './chatgpt-account';

export function AiSettings() {
  const settings = useAiSettings();
  const { remote, connection, isLoading, isPending } = settings;
  if (isLoading || !remote) return <PageLoading label="Loading AI settings…" />;
  return (
    <SettingsSplitLayout
      aside={
        <SettingsAside
          animationDelay="70ms"
          description="Connect your own ChatGPT account to use AI throughout Groam. Each person uses their own ChatGPT plan."
          icon={Sparkles}
          title="Your ChatGPT connection"
        />
      }
    >
      <SettingsPanel>
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              See the work Groam has done for your group.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/agents" data-testid={testIds.navAgents}>
                Background activity
              </Link>
            </Button>
          </div>
          <SettingsPanelHeading
            description="Sign in with ChatGPT to authorize eligible AI requests using your plan."
            icon={Sparkles}
            title="ChatGPT"
          />
          {!remote.available ? (
            <p role="status" className="text-sm leading-relaxed text-muted-foreground">
              {remote.unavailableReason ??
                'ChatGPT plan access is not available for this deployment.'}
            </p>
          ) : null}
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
              className="flex flex-col items-start gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              role="note"
            >
              <p className="text-sm leading-relaxed">
                Eligible Groam AI usage counts against your connected ChatGPT plan and its limits.
                You can manage access and usage in ChatGPT settings.
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
    </SettingsSplitLayout>
  );
}
