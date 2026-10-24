import {
  defaultSettingsSection,
  isSettingsSection
} from '@/features/settings/settings-shell/settings-sections';
import { SettingsView } from '@/features/settings/settings-shell/settings-view';
import { Navigate, useNavigate, useParams } from '@/lib/navigation/router';

export default function SettingsSectionPage() {
  const { section = '' } = useParams<{ section: string }>();
  const navigate = useNavigate();

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
