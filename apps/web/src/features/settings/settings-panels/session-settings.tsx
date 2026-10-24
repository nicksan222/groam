import { Laptop, LogOut, RefreshCw, Smartphone } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { IconTile } from '@groam/ui/components/icon-tile';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import { useState } from 'react';
import { useSessionSettings } from '@/features/settings/hooks/use-session-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';

const COLLAPSED_COUNT = 5;
const sessionDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function SessionCard({
  currentToken,
  isPending,
  pendingAction,
  revoke,
  session
}: {
  currentToken: string;
  isPending: boolean;
  pendingAction: string | null;
  revoke: (token: string) => Promise<unknown>;
  session: ReturnType<typeof useSessionSettings>['state']['sessions'][number];
}) {
  const isCurrent = session.token === currentToken;
  const device = describeDevice(session.userAgent);
  const DeviceIcon = device.isMobile ? Smartphone : Laptop;
  return (
    <div className="flex min-w-0 items-center gap-3 py-4">
      <IconTile className={cn(isCurrent && 'text-foreground')} variant="muted">
        <DeviceIcon className="size-4" />
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{device.label}</p>
          {isCurrent ? <Badge variant="emerald">Current</Badge> : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {session.ipAddress || 'IP unavailable'} · {formatDate(session.createdAt)}
        </p>
      </div>
      {!isCurrent ? (
        <Button
          aria-label={`Sign out ${device.label}`}
          disabled={isPending}
          onClick={() => void revoke(session.token)}
          pending={pendingAction === session.token}
          size="sm"
          type="button"
          variant="ghost"
        >
          <LogOut />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      ) : null}
    </div>
  );
}

export function SessionSettings({ currentToken }: { currentToken: string }) {
  const { refresh, revoke, revokeOthers, state } = useSessionSettings();
  const otherSessionCount = state.sessions.filter(
    (session) => session.token !== currentToken
  ).length;
  const isPending = state.pendingAction !== null;

  if (state.isLoading && state.sessions.length === 0)
    return <PageLoading label="Loading sessions…" />;

  return (
    <SettingsPanel>
      <SettingsPanelHeading
        description="Browsers and devices currently signed in."
        icon={Laptop}
        title="Active sessions"
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {state.sessions.length === 0 && state.isLoading
              ? 'Checking your active sessions…'
              : `${state.sessions.length} active ${state.sessions.length === 1 ? 'session' : 'sessions'}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Refresh sessions"
              disabled={state.isLoading || isPending}
              onClick={() => void refresh()}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <RefreshCw className={state.isLoading ? 'animate-spin' : undefined} />
            </Button>
            {otherSessionCount > 0 ? (
              <Button
                disabled={isPending}
                onClick={() => void revokeOthers(currentToken)}
                pending={state.pendingAction === 'others'}
                size="sm"
                type="button"
                variant="outline"
              >
                <LogOut />
                Sign out others
              </Button>
            ) : null}
          </div>
        </div>

        {state.error ? (
          <Shell.Card
            className="flex flex-wrap items-center justify-between gap-3"
            padding="sm"
            variant="destructive"
          >
            <FormFeedback error={state.error} />
            <Button onClick={() => void refresh()} size="sm" type="button" variant="outline">
              Try again
            </Button>
          </Shell.Card>
        ) : null}

        <SessionList
          currentToken={currentToken}
          isPending={isPending}
          revoke={revoke}
          state={state}
        />
      </div>
    </SettingsPanel>
  );
}

function SessionList({
  currentToken,
  isPending,
  revoke,
  state
}: {
  currentToken: string;
  isPending: boolean;
  revoke: ReturnType<typeof useSessionSettings>['revoke'];
  state: ReturnType<typeof useSessionSettings>['state'];
}) {
  const [expanded, setExpanded] = useState(false);
  if (state.sessions.length === 0)
    return <DashedEmpty className="px-4 py-8">No active sessions found.</DashedEmpty>;
  const collapsed = !expanded && state.sessions.length > COLLAPSED_COUNT;
  const sessions = collapsed ? state.sessions.slice(0, COLLAPSED_COUNT) : state.sessions;
  return (
    <div className="divide-y divide-border">
      {sessions.map((session) => (
        <SessionCard
          currentToken={currentToken}
          isPending={isPending}
          key={session.id}
          pendingAction={state.pendingAction}
          revoke={revoke}
          session={session}
        />
      ))}
      {collapsed ? (
        <div className="pt-3">
          <Button onClick={() => setExpanded(true)} size="sm" type="button" variant="ghost">
            Show all {state.sessions.length} sessions
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function browserName(userAgent: string): string {
  if (/Edg\//u.test(userAgent)) return 'Edge';
  if (/Firefox\//u.test(userAgent)) return 'Firefox';
  if (/(?:Chrome|CriOS)\//u.test(userAgent)) return 'Chrome';
  if (/Safari\//u.test(userAgent)) return 'Safari';
  return 'Browser';
}

function platformName(userAgent: string): string | null {
  if (/iPad|iPhone/u.test(userAgent)) return 'iOS';
  if (/Android/u.test(userAgent)) return 'Android';
  if (/Windows/u.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS/u.test(userAgent)) return 'macOS';
  if (/Linux/u.test(userAgent)) return 'Linux';
  return null;
}

function describeDevice(userAgent?: null | string): { isMobile: boolean; label: string } {
  if (!userAgent) return { isMobile: false, label: 'Unknown browser' };

  const browser = browserName(userAgent);
  const platform = platformName(userAgent);
  return {
    isMobile: /Android|iPad|iPhone|Mobile/u.test(userAgent),
    label: platform ? `${browser} on ${platform}` : browser
  };
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'at an unknown time';
  return sessionDateFormatter.format(date);
}
