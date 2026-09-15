import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Spinner } from '@groam/ui/components/spinner';
import { Database, HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  exportGroamData,
  importGroamData,
  readGroamDataDir
} from '@/features/settings/hooks/use-desktop-data';
import {
  SettingsAside,
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout
} from '@/features/settings/settings-shell/settings-panel';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';

export function DataSettings() {
  const [path, setPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<'export' | 'import' | null>(null);

  useEffect(() => {
    void readGroamDataDir()
      .then(setPath)
      .catch((caught: unknown) => {
        setError(errorMessage(caught, 'Unable to locate the Groam data folder'));
      });
  }, []);

  const run = async (action: 'export' | 'import') => {
    setPending(action);
    setError(null);
    setMessage(null);
    try {
      const completed = action === 'export' ? await exportGroamData() : await importGroamData();
      if (completed) {
        setMessage(
          action === 'export'
            ? 'Copied this device’s Groam data to the folder you picked.'
            : 'Restored Groam data. The local backend is restarting.'
        );
      }
    } catch (caught: unknown) {
      setError(
        errorMessage(
          caught,
          action === 'export' ? 'Unable to export Groam data' : 'Unable to restore Groam data'
        )
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <SettingsSplitLayout
      aside={
        <SettingsAside
          animationDelay="70ms"
          description="Trips, chats, and group keys live in this folder on this computer. Export a copy before you reinstall or move machines."
          icon={HardDrive}
          title="Stored on this computer"
        />
      }
    >
      <SettingsPanel>
        <SettingsPanelHeading
          description="The packaged app keeps Convex data under the OS application folder. File → Export data in the menu does the same copy."
          icon={Database}
          title="Local data"
        />
        <p
          className="break-all text-sm text-muted-foreground"
          data-testid={testIds.settingsDataPath}
        >
          {path ?? 'Locating data folder…'}
        </p>
        <FormFeedback error={error} message={message} />
        <SettingsFooter>
          <Button
            data-testid={testIds.settingsDataExport}
            disabled={pending !== null}
            onClick={() => void run('export')}
            type="button"
            variant="outline"
          >
            {pending === 'export' && <Spinner />}
            Export data
          </Button>
          <Button
            data-testid={testIds.settingsDataImport}
            disabled={pending !== null}
            onClick={() => void run('import')}
            type="button"
          >
            {pending === 'import' && <Spinner />}
            Restore data
          </Button>
        </SettingsFooter>
      </SettingsPanel>
    </SettingsSplitLayout>
  );
}
