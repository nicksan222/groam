'use client';

import { TimelineBadge } from './timeline-badge';
import { TimelineBody } from './timeline-body';
import { TimelineBreak } from './timeline-break';
import {
  TimelineCard,
  TimelineCardActions,
  TimelineCardBody,
  TimelineCardHeader
} from './timeline-card';
import { Timeline as TimelineRoot } from './timeline-container';
import { TimelineItem } from './timeline-item';

const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Badge: TimelineBadge,
  Body: TimelineBody,
  Break: TimelineBreak,
  Card: TimelineCard,
  CardActions: TimelineCardActions,
  CardBody: TimelineCardBody,
  CardHeader: TimelineCardHeader
});

export default Timeline;

export type { TimelineBadgeProps } from './timeline-badge';
export type { TimelineBodyProps } from './timeline-body';
export type { TimelineBreakProps } from './timeline-break';
export type {
  TimelineCardActionsProps,
  TimelineCardBodyProps,
  TimelineCardHeaderProps,
  TimelineCardProps
} from './timeline-card';
export type { TimelineProps } from './timeline-container';
export type { TimelineVariant } from './timeline-context';
export type { TimelineItemProps } from './timeline-item';
