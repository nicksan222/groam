import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_workspace/chat/')({
  // Empty pane is rendered by ChatWorkspace when no discussion is selected.
  component: () => null
});
