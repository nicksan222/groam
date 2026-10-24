import { defaultSettingsSection } from '@/features/settings/settings-shell/settings-sections';
import { Navigate } from '@/lib/navigation/router';

export default function SettingsIndexPage() {
  return <Navigate params={{ section: defaultSettingsSection }} replace to="/settings/$section" />;
}
