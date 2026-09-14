import { createFileRoute } from '@tanstack/react-router';
import { AgentsListView } from '@/features/agents/agent-list/agents-list-view';

export const Route = createFileRoute('/_workspace/agents/')({ component: AgentsListView });
