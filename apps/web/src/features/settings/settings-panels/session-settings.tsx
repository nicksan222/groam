import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { LiftCard } from '@groam/ui/components/lift-card';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { Laptop, LogOut, RefreshCw, Smartphone } from 'lucide-react';
import { useSessionSettings } from '@/features/settings/hooks/use-session-settings';
import {
  SettingsPanel,
  SettingsPanelHeading
} from '@/features/settings/settings-shell/settings-panel';

const sessionDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function SessionCard({
  currentToken,
  index,
  isPending,
  pendingAction,
  revoke,
  session
}: {
  currentToken: string;
  index: number;
  isPending: boolean;
  pendingAction: string | null;
  revoke: (token: string) => Promise<unknown>;
  session: ReturnType<typeof useSessionSettings>['state']['sessions'][number];
}) {
  const isCurrent = session.token === currentToken;
  const device = describeDevice(session.userAgent);
  const DeviceIcon = device.isMobile ? Smartphone : Laptop;
  return (
    <LiftCard
      className={cn('flex items-center gap-3 p-3.5', isCurrent && 'border-foreground/20')}
      key={session.id}
      style={{ animationDelay: `${80 + index * 40}ms` }}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl border text-muted-foreground',
          isCurrent ? 'border-foreground/20 text-foreground' : 'border-border'
        )}
      >
        <DeviceIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{device.label}</p>
          {isCurrent ? <Badge variant="emerald">Current</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {session.ipAddress || 'IP unavailable'} · {formatDate(session.createdAt)}
        </p>
      </div>
      {!isCurrent ? (
        <Button
          aria-label={`Sign out ${device.label}`}
          disabled={isPending}
          onClick={() => void revoke(session.token)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {pendingAction === session.token ? <Spinner /> : <LogOut />}
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      ) : null}
    </LiftCard>
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
        action={
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
        }
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
          {otherSessionCount > 0 ? (
            <Button
              disabled={isPending}
              onClick={() => void revokeOthers(currentToken)}
              size="sm"
              type="button"
              variant="outline"
            >
              {state.pendingAction === 'others' ? <Spinner /> : <LogOut />}
              Sign out others
            </Button>
          ) : null}
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

        {state.isLoading && state.sessions.length === 0 ? (
          <div aria-busy="true" aria-label="Loading sessions…" className="space-y-2" role="status">
            {[0, 1, 2].map((index) => (
              <LiftCard key={index} className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </LiftCard>
            ))}
          </div>
        ) : state.sessions.length === 0 ? (
          <DashedEmpty className="px-4 py-8">No active sessions found.</DashedEmpty>
        ) : (
          <div className="space-y-2">
            {state.sessions.map((session, index) => (
              <SessionCard
                currentToken={currentToken}
                index={index}
                isPending={isPending}
                key={session.id}
                pendingAction={state.pendingAction}
                revoke={revoke}
                session={session}
              />
            ))}
          </div>
        )}
      </div>
    </SettingsPanel>
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
