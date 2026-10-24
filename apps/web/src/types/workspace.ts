import type { authClient } from '@groam/auth/client';
import type { Icon } from '@groam/icons';
import type { AppPath } from '@/types/navigation';

export type ActiveOrganization = NonNullable<
  ReturnType<typeof authClient.useActiveOrganization>['data']
>;
export type Organization = NonNullable<
  ReturnType<typeof authClient.useListOrganizations>['data']
>[number];
export type Session = NonNullable<ReturnType<typeof authClient.useSession>['data']>;
export type WorkspaceContextValue = {
  activeOrganization: ActiveOrganization;
  activeRole: string;
  organizations: Organization[];
  session: Session;
  switchOrganization: (organizationId: string) => Promise<void>;
};

export type WorkspaceDialogControlProps = {
  onClose: () => void;
  open: boolean;
};

export type SidebarNavItem = {
  icon: Icon;
  label: string;
  testId: string;
  to: Extract<AppPath, '/' | '/settings'>;
};

export type PaginatedListStatus = 'CanLoadMore' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore';

export type ConfirmFn = (title: string, description: string) => Promise<boolean>;

export type RequestState = { error: string | null; isPending: boolean };
