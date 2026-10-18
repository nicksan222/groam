import { createFileRoute } from '@tanstack/react-router';
import { IssueListView } from '@/features/issues/issue-list/issue-list-view';

export const Route = createFileRoute('/_workspace/issues/')({ component: IssueListView });
