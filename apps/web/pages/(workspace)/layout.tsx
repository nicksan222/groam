import { ReferenceProvider } from '@/features/workspace/workspace-shell/reference-provider';
import { WorkspaceProvider } from '@/features/workspace/workspace-shell/workspace-context';
import { WorkspaceShell } from '@/features/workspace/workspace-shell/workspace-shell';
import type { LayoutProps } from '@/lib/navigation/router';

/** The signed-in workspace shell; Void keeps it mounted while its pages change. */
export default function WorkspaceLayout({ children }: LayoutProps) {
  return (
    <WorkspaceProvider>
      <ReferenceProvider>
        <WorkspaceShell>{children}</WorkspaceShell>
      </ReferenceProvider>
    </WorkspaceProvider>
  );
}
