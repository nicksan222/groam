import { createFileRoute, Navigate } from '@tanstack/react-router';
import { defaultSettingsSection } from '@/features/settings/settings-shell/settings-sections';

export const Route = createFileRoute('/_workspace/settings/')({
  component: SettingsIndexRoute
});

function SettingsIndexRoute() {
  return <Navigate params={{ section: defaultSettingsSection }} replace to="/settings/$section" />;
}
