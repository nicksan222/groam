use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::{Update, UpdaterExt};

pub(crate) fn spawn_startup_check(app: &AppHandle) {
  if cfg!(debug_assertions) || !supports_in_place_update() {
    return;
  }
  let app = app.clone();
  tauri::async_runtime::spawn(async move {
    let Ok(updater) = app.updater() else {
      return;
    };
    let Ok(Some(update)) = updater.check().await else {
      return;
    };
    let Ok(bytes) = update.download(|_, _| {}, || {}).await else {
      return;
    };
    // Dialogs, Convex stop/start, and wait_for_app use blocking I/O.
    let _ = tauri::async_runtime::spawn_blocking(move || offer_and_install(app, update, bytes)).await;
  });
}

fn offer_and_install(app: AppHandle, update: Update, bytes: Vec<u8>) {
  if !app
    .dialog()
    .message(format!(
      "Groam {} is ready. Restart to install?",
      update.version
    ))
    .title("Update ready")
    .buttons(MessageDialogButtons::OkCancelCustom(
      "Restart".into(),
      "Later".into(),
    ))
    .blocking_show()
  {
    return;
  }

  // Hold the data-op lock through stop / install / restart so export/restore
  // cannot race the Convex workspace while we tear it down.
  if let Err(error) = crate::with_data_op_lock(&app, || {
    crate::stop_runtime(&app);
    if !crate::wait_until_backend_idle() {
      restore_runtime(&app)?;
      return Err(
        "Convex is still running; cannot install an update while the local backend is up."
          .to_string(),
      );
    }
    if let Err(error) = update.install(bytes) {
      restore_runtime(&app)?;
      return Err(format!(
        "Groam could not install the update. This version keeps running. {error}"
      ));
    }
    app.restart();
  }) {
    app
      .dialog()
      .message(error)
      .kind(MessageDialogKind::Error)
      .title("Unable to install update")
      .blocking_show();
  }
}

fn restore_runtime(app: &AppHandle) -> Result<(), String> {
  crate::start_runtime(app)?;
  crate::wait_for_app().map_err(|error| {
    format!("Could not restart the local backend ({error}). Quit and reopen the app.")
  })
}

/// Linux `.deb` installs cannot be replaced in place; only AppImage can.
fn supports_in_place_update() -> bool {
  #[cfg(target_os = "linux")]
  {
    std::env::var_os("APPIMAGE").is_some()
  }
  #[cfg(not(target_os = "linux"))]
  {
    true
  }
}
