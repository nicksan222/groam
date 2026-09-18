'use client';

import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { avatarClasses, initials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';

export type NavUserProps = {
  user: { avatar: string; detail: string; name: string };
  onLogout?: () => void;
  onSettings?: () => void;
  isLoading?: boolean;
};

function LoadingSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton className={isCollapsed ? 'justify-center' : ''} disabled size="lg">
          <Avatar className="h-8 w-8 shrink-0 rounded-lg">
            <AvatarFallback className="animate-pulse rounded-lg bg-sidebar-foreground/20" />
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="h-4 w-20 animate-pulse rounded bg-sidebar-foreground/20" />
                <div className="mt-1 h-3 w-24 animate-pulse rounded bg-sidebar-foreground/20" />
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-50" />
            </>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function NavUser({ user, onLogout, onSettings, isLoading = false }: NavUserProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (isLoading) return <LoadingSkeleton isCollapsed={isCollapsed} />;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className={cn(
                'h-auto gap-2 rounded-lg px-2 py-2',
                isCollapsed && 'justify-center px-2'
              )}
              data-testid="nav-user-trigger"
              size="lg"
              tooltip={isCollapsed ? user.name : undefined}
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarImage alt={user.name} src={user.avatar} />
                <AvatarFallback
                  className={cn('rounded-lg text-xs font-semibold', avatarClasses(user.name))}
                >
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.detail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56" side="top" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <div className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.detail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {onSettings ? (
              <DropdownMenuItem onClick={onSettings}>
                <Settings />
                Settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onLogout}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
