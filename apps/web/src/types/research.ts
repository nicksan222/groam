import type { api } from '@groam/backend/api';
import type { FunctionArgs } from 'convex/server';

/** The backend's tagged link target, as accepted by the research link routes. */
export type ResearchBackendTarget = FunctionArgs<
  typeof api.routes.discussions.research.links.link.run
>['target'];

export type ResearchSummary = {
  brief: null | string;
  id: string;
  lastMessage: null | { authorName: string; text: string };
  linkCount: number;
  participantCount: number;
  shortId: string;
  title: string;
  unread: boolean;
  updatedAt: number;
};

export type ResearchLinkTarget =
  | { id: string; kind: 'activity' }
  | { id: string; kind: 'destination' }
  | { id: string; kind: 'idea' }
  | { id: string; kind: 'issue' }
  | { id: string; kind: 'stay' };

export type ResearchLink = {
  href: null | string;
  id: string;
  label: string;
  target: ResearchLinkTarget;
};

export type ResearchDetail = {
  brief: null | string;
  canManage: boolean;
  id: string;
  links: ResearchLink[];
  shortId: string;
  title: string;
  tripId: string;
};

export type LinkTargetOption = {
  group: string;
  label: string;
  target: ResearchLinkTarget;
};
