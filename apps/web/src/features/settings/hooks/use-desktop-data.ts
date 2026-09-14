import { env } from '@groam/env/web-client';

async function invokeCommand<T>(command: string): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(command);
}

const packagedBackupError =
  'Export and restore are only available in the packaged Groam app. Dev sessions use the repository .convex directory.';

function assertPackagedDesktop(action: 'export' | 'restore') {
  if (!env.isDesktop) throw new Error(`Data ${action} is only available in the desktop app.`);
  if (env.mode !== 'production') throw new Error(packagedBackupError);
}

export async function readGroamDataDir(): Promise<string> {
  assertPackagedDesktop('export');
  return await invokeCommand<string>('groam_data_dir_path');
}

export async function exportGroamData(): Promise<boolean> {
  assertPackagedDesktop('export');
  return await invokeCommand<boolean>('export_groam_data');
}

export async function importGroamData(): Promise<boolean> {
  assertPackagedDesktop('restore');
  return await invokeCommand<boolean>('import_groam_data');
}
