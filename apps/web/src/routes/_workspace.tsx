import { createFileRoute } from '@tanstack/react-router';
import { ReferenceProvider } from '@/features/workspace/workspace-shell/reference-provider';
import { WorkspaceProvider } from '@/features/workspace/workspace-shell/workspace-context';
import { WorkspaceShell } from '@/features/workspace/workspace-shell/workspace-shell';

export const Route = createFileRoute('/_workspace')({
  component: WorkspaceLayout
});

function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <ReferenceProvider>
        <WorkspaceShell />
      </ReferenceProvider>
    </WorkspaceProvider>
  );
}
