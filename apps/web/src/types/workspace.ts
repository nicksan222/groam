import type { authClient } from '@groam/auth/client';
import type {
  manageNavigation,
  mobileNavigation,
  primaryNavigation
} from '@/features/workspace/workspace-sidebar/sidebar-nav';

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

export type SidebarFavoriteItem = {
  favorite?: boolean;
  lastUpdatedAt: number;
};

export type SidebarNavItem =
  | (typeof primaryNavigation)[number]
  | (typeof manageNavigation)[number]
  | (typeof mobileNavigation)[number];

export type PaginatedListStatus = 'CanLoadMore' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore';
export type NestedListStatus = PaginatedListStatus;

export type ConfirmFn = (title: string, description: string) => Promise<boolean>;

export type SidebarSectionKey = 'chat' | 'ideas' | 'issues' | 'trips';

export type RequestState = { error: string | null; isPending: boolean };
