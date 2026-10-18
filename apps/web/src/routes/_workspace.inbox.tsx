import { createFileRoute } from '@tanstack/react-router';
import { InboxView } from '@/features/inbox/inbox-view';

export const Route = createFileRoute('/_workspace/inbox')({ component: InboxView });
