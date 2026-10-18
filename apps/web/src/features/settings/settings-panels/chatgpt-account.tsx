import { Button } from '@groam/ui/components/button';
import { testIds } from '@/lib/test-ids';
import type { ChatGptConnection, ChatGptConnectionId } from '@/types/ai-settings';

export function ChatGptAccount({
  account,
  isActive,
  isPending,
  canConnect,
  onConnect,
  onDisconnect,
  onSelect
}: {
  account: ChatGptConnection;
  isActive: boolean;
  isPending: boolean;
  canConnect: boolean;
  onConnect: (id: ChatGptConnectionId) => Promise<void>;
  onDisconnect: (id: ChatGptConnectionId) => Promise<void>;
  onSelect: (id: ChatGptConnectionId) => Promise<void>;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start justify-between gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 space-y-1">
        <p className="text-sm leading-5 font-medium break-words">{account.label}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          {account.needsReconnect
            ? 'Reconnect required'
            : account.connected
              ? 'Connected'
              : 'Disconnected'}
          {isActive ? ' · Active account' : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {account.connected && !account.needsReconnect && !isActive ? (
          <Button
            disabled={isPending}
            onClick={() => void onSelect(account.id)}
            size="sm"
            variant="outline"
          >
            Use account
          </Button>
        ) : null}
        {(!account.connected || account.needsReconnect) && canConnect ? (
          <Button disabled={isPending} onClick={() => void onConnect(account.id)} size="sm">
            Reconnect
          </Button>
        ) : null}
        {account.connected ? (
          <Button
            data-testid={isActive ? testIds.settingsAiRemove : undefined}
            disabled={isPending}
            onClick={() => void onDisconnect(account.id)}
            size="sm"
            variant="outline"
          >
            Disconnect
          </Button>
        ) : null}
      </div>
    </div>
  );
}
