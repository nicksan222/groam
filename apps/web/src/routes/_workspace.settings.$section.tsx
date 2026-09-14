import { createFileRoute, Navigate } from '@tanstack/react-router';
import {
  defaultSettingsSection,
  isSettingsSection
} from '@/features/settings/settings-shell/settings-sections';
import { SettingsView } from '@/features/settings/settings-shell/settings-view';

export const Route = createFileRoute('/_workspace/settings/$section')({
  component: SettingsSectionRoute
});

function SettingsSectionRoute() {
  const { section } = Route.useParams();
  const navigate = Route.useNavigate();

  if (!isSettingsSection(section)) {
    return (
      <Navigate params={{ section: defaultSettingsSection }} replace to="/settings/$section" />
    );
  }

  return (
    <SettingsView
      activeSection={section}
      onSectionChange={(nextSection) =>
        void navigate({
          params: { section: nextSection },
          replace: true,
          to: '/settings/$section'
        })
      }
    />
  );
}
