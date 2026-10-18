import { createFileRoute } from '@tanstack/react-router';
import { IdeaListView } from '@/features/ideas/idea-list/idea-list-view';

export const Route = createFileRoute('/_workspace/ideas/')({ component: IdeaListView });
