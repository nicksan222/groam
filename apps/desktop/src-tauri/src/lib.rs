use std::{
  fs, io,
  net::{SocketAddr, TcpStream},
  path::{Path, PathBuf},
  process::{Child, Command, Stdio},
  sync::{Arc, Mutex},
  time::Duration,
};

mod data_dir;
mod updater;

use data_dir::{
  recover_interrupted_data_dir, replace_dir, replace_dir_keep_previous, sync_writable_runtime,
};

use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath, MessageDialogKind};

const APP_URL: &str = "http://127.0.0.1:3211/";

#[derive(Clone)]
struct RuntimeState(Arc<Mutex<Option<Child>>>);

fn executable_dir() -> PathBuf {
  std::env::current_exe()
    .ok()
    .and_then(|path| path.parent().map(Path::to_path_buf))
    .unwrap_or_else(|| PathBuf::from("."))
}

fn sidecar_binary(name: &str) -> PathBuf {
  let mut path = executable_dir();
  if cfg!(windows) {
    path.push(format!("{name}.exe"));
  } else {
    path.push(name);
  }
  path
}

fn bun_command_path() -> PathBuf {
  let bundled = sidecar_binary("bun");
  if bundled.exists() {
    return bundled;
  }
  PathBuf::from("bun")
}

fn repo_root(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
  if let Ok(root) = std::env::var("GROAM_PROJECT_ROOT") {
    return Ok(PathBuf::from(root));
  }

  // Packaged resources are read-only on system-wide Linux/Windows installs
  // (and signed macOS bundles). Convex writes `.convex` / `.env.local` into
  // the project root, so run from a writable app-data copy.
  let staged = app.path().resource_dir()?.join("groam-runtime");
  let writable = app.path().app_data_dir()?.join("groam-runtime");
  sync_writable_runtime(&staged, &writable)?;
  Ok(writable)
}

fn groam_backup_marker(dir: &Path) -> PathBuf {
  dir.join(".groam-backup")
}

fn write_groam_backup_marker(dir: &Path) -> io::Result<()> {
  fs::write(groam_backup_marker(dir), b"groam-data-backup\n")
}

fn groam_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  groam_data_dir_opts(app, true)
}

fn groam_data_dir_opts(app: &tauri::AppHandle, recover: bool) -> Result<PathBuf, String> {
  let parent = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;
  if recover {
    recover_interrupted_data_dir(&parent, "groam-data")?;
  }
  let data_dir = parent.join("groam-data");
  fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
  if !groam_backup_marker(&data_dir).is_file() {
    write_groam_backup_marker(&data_dir).map_err(|error| error.to_string())?;
  }
  Ok(data_dir)
}

/// Must match `PINNED_CONVEX_BACKEND_VERSION` in apps/desktop/scripts/prepare-sidecar.ts.
const PINNED_CONVEX_BACKEND_VERSION: &str = "precompiled-2026-08-25-7cce8fb";

fn seed_convex_cache(data_dir: &Path) {
  let bundled = sidecar_binary("convex-local-backend");
  if !bundled.exists() {
    return;
  }
  let cache_dir = data_dir
    .join(".cache")
    .join("convex")
    .join("binaries")
    .join(PINNED_CONVEX_BACKEND_VERSION);
  if fs::create_dir_all(&cache_dir).is_err() {
    return;
  }
  let destination = cache_dir.join(if cfg!(windows) {
    "convex-local-backend.exe"
  } else {
    "convex-local-backend"
  });
  let _ = fs::copy(&bundled, destination);

  if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
    let user_cache = PathBuf::from(home)
      .join(".cache")
      .join("convex")
      .join("binaries")
      .join(PINNED_CONVEX_BACKEND_VERSION);
    if fs::create_dir_all(&user_cache).is_ok() {
      let _ = fs::copy(
        &bundled,
        user_cache.join(if cfg!(windows) {
          "convex-local-backend.exe"
        } else {
          "convex-local-backend"
        }),
      );
    }
  }
}

fn runtime_command(project_root: &Path, data_dir: &Path) -> Command {
  let bun = bun_command_path();
  let mut command = if cfg!(windows) && bun == PathBuf::from("bun") {
    let mut command = Command::new("cmd");
    command.args(["/C", "bun", "runtime/start.ts"]);
    command
  } else if cfg!(windows) {
    let mut command = Command::new(&bun);
    command.arg("runtime/start.ts");
    command
  } else {
    let mut command = Command::new(&bun);
    command.arg("runtime/start.ts");
    command
  };

  command
    .current_dir(project_root)
    .env("CONVEX_AGENT_MODE", "anonymous")
    .env("GROAM_DATA_DIR", data_dir)
    .env("GROAM_REPLACE_CONVEX_DIR", "1")
    .env("GROAM_SITE_ORIGIN", "http://127.0.0.1:3211")
    .env("XDG_CACHE_HOME", data_dir.join(".cache"))
    .stdout(Stdio::inherit())
    .stderr(Stdio::inherit());

  #[cfg(unix)]
  {
    use std::os::unix::process::CommandExt;
    command.process_group(0);
  }

  command
}

pub(crate) fn wait_for_app() -> Result<(), Box<dyn std::error::Error>> {
  let client = reqwest::blocking::Client::builder()
    .timeout(Duration::from_secs(2))
    .build()?;

  for _ in 0..120 {
    if let Ok(response) = client.get(APP_URL).send() {
      if response.status().is_success() {
        return Ok(());
      }
    }
    std::thread::sleep(Duration::from_secs(2));
  }

  Err("Timed out waiting for Groam to start".into())
}

fn spawn_runtime(
  app: &tauri::AppHandle,
  recover: bool,
) -> Result<Arc<Mutex<Option<Child>>>, Box<dyn std::error::Error>> {
  let project_root = repo_root(app)?;
  let data_dir = groam_data_dir_opts(app, recover).map_err(|error| error.to_string())?;
  seed_convex_cache(&data_dir);
  Ok(Arc::new(Mutex::new(Some(
    runtime_command(&project_root, &data_dir).spawn()?,
  ))))
}

fn file_path_to_pathbuf(file_path: FilePath) -> Option<PathBuf> {
  match file_path {
    FilePath::Path(path) => Some(path),
    _ => None,
  }
}

fn backend_is_listening() -> bool {
  let addr = SocketAddr::from(([127, 0, 0, 1], 3210));
  TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok()
}

pub(crate) fn wait_until_backend_idle() -> bool {
  for _ in 0..50 {
    if !backend_is_listening() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  !backend_is_listening()
}

fn terminate_runtime(child: &mut Child) -> bool {
  let pid = child.id();
  #[cfg(unix)]
  {
    let group = format!("-{pid}");
    let _ = Command::new("kill")
      .args(["-s", "TERM", "--", &group])
      .status();
    for _ in 0..50 {
      let reaped = matches!(child.try_wait(), Ok(Some(_)));
      if reaped && !backend_is_listening() {
        return true;
      }
      std::thread::sleep(Duration::from_millis(100));
    }
    let _ = Command::new("kill")
      .args(["-s", "KILL", "--", &group])
      .status();
  }
  #[cfg(windows)]
  {
    let pid = pid.to_string();
    let _ = Command::new("taskkill").args(["/T", "/PID", &pid]).status();
    for _ in 0..50 {
      let reaped = matches!(child.try_wait(), Ok(Some(_)));
      if reaped && !backend_is_listening() {
        return true;
      }
      std::thread::sleep(Duration::from_millis(100));
    }
    let _ = Command::new("taskkill")
      .args(["/F", "/T", "/PID", &pid])
      .status();
  }
  let _ = child.wait();
  wait_until_backend_idle()
}

pub(crate) fn stop_runtime(app: &tauri::AppHandle) {
  if let Some(runtime) = app.try_state::<RuntimeState>() {
    if let Some(mut child) = runtime.0.lock().expect("runtime state poisoned").take() {
      let _ = terminate_runtime(&mut child);
    }
  }
}

pub(crate) fn start_runtime(app: &tauri::AppHandle) -> Result<(), String> {
  start_runtime_opts(app, true)
}

fn start_runtime_opts(app: &tauri::AppHandle, recover: bool) -> Result<(), String> {
  stop_runtime(app);
  let child = spawn_runtime(app, recover).map_err(|error| error.to_string())?;
  if let Some(runtime) = app.try_state::<RuntimeState>() {
    *runtime.0.lock().expect("runtime state poisoned") = child.lock().expect("child poisoned").take();
  } else {
    app.manage(RuntimeState(child));
  }
  Ok(())
}

fn is_groam_data_backup(source: &Path) -> bool {
  groam_backup_marker(source).is_file()
    && source
      .join(".convex")
      .join("local")
      .join("default")
      .join("backend.sqlite3")
      .is_file()
}

fn restore_groam_data(app: &tauri::AppHandle, source: &Path) -> Result<(), String> {
  if !is_groam_data_backup(source) {
    return Err("Choose a Groam data folder exported from this app.".into());
  }
  let lock = app.try_state::<DataOpLock>();
  let _guard = lock
    .as_ref()
    .map(|state| state.0.lock().expect("data operation lock poisoned"));
  let managed = app.try_state::<RuntimeState>().is_some();
  let mut restart_on_error = false;
  if managed {
    stop_runtime(app);
    restart_on_error = true;
    if backend_is_listening() {
      start_runtime(app)?;
      return Err(
        "Convex is still running; cannot change Groam data while the local backend is up.".into(),
      );
    }
  }
  let destination = match groam_data_dir(app) {
    Ok(path) => path,
    Err(error) => {
      if restart_on_error {
        let _ = start_runtime(app);
      }
      return Err(error);
    }
  };
  let previous = match replace_dir_keep_previous(source, &destination) {
    Ok(previous) => previous,
    Err(error) => {
      if restart_on_error {
        let _ = start_runtime(app);
      }
      return Err(error.to_string());
    }
  };
  if managed {
    if let Err(error) = start_runtime_opts(app, false)
      .and_then(|_| wait_for_app().map_err(|ready| ready.to_string()))
    {
      stop_runtime(app);
      if !wait_until_backend_idle() {
        return Err(match &previous {
          Some(path) => format!(
            "Restore did not start Groam; previous data is still at {}. Convex is still running so rollback was skipped. {error}",
            path.display()
          ),
          None => format!(
            "Restore did not start Groam; Convex is still running so rollback was skipped. {error}"
          ),
        });
      }
      let rollback = destination
        .parent()
        .ok_or_else(|| "Groam data directory has no parent".to_string())
        .and_then(|parent| recover_interrupted_data_dir(parent, "groam-data"));
      let restart = start_runtime(app);
      return Err(match (rollback, restart) {
        (Err(rollback), _) => {
          format!("Restore failed and previous data could not be restored. {rollback}")
        }
        (Ok(()), Err(restart)) => {
          format!("Restore did not start Groam; previous data was kept. {error} ({restart})")
        }
        (Ok(()), Ok(())) => {
          format!("Restore did not start Groam; previous data was kept. {error}")
        }
      });
    }
  }
  if let Some(previous) = previous {
    let pointer = data_dir::recover_pointer(
      destination.parent().ok_or("Groam data directory has no parent")?,
      destination
        .file_name()
        .ok_or("Groam data directory has no name")?,
    );
    // Drop the recover pointer first so a crash during previous-tree
    // cleanup cannot roll a healthy import back onto a half-deleted tree.
    match fs::remove_file(&pointer) {
      Ok(()) => {}
      Err(error) if error.kind() == io::ErrorKind::NotFound => {}
      Err(error) => {
        return Err(format!(
          "Restore started but Groam could not confirm it; previous data is still at {}. {error}",
          previous.display()
        ));
      }
    }
    let _ = fs::remove_dir_all(previous);
  }
  Ok(())
}

fn directory_is_empty(path: &Path) -> io::Result<bool> {
  Ok(fs::read_dir(path)?.next().is_none())
}

fn assert_export_destination_is_safe(destination: &Path) -> Result<(), String> {
  if !destination.exists() {
    return Ok(());
  }
  if directory_is_empty(destination).map_err(|error| error.to_string())? {
    return Ok(());
  }
  if is_groam_data_backup(destination) {
    return Ok(());
  }
  Err("Choose an empty folder or a previous Groam export.".into())
}

fn export_groam_data_to(app: &tauri::AppHandle, destination: &Path) -> Result<(), String> {
  with_backend_stopped(app, || {
    let source = groam_data_dir(app)?;
    if let (Some(parent), Some(name)) = (destination.parent(), destination.file_name()) {
      recover_interrupted_data_dir(parent, &name.to_string_lossy())?;
    }
    assert_export_paths_are_separate(&source, destination)?;
    assert_export_destination_is_safe(destination)?;
    replace_dir(&source, destination).map_err(|error| error.to_string())
  })
}

fn assert_export_paths_are_separate(source: &Path, destination: &Path) -> Result<(), String> {
  fs::create_dir_all(destination).map_err(|error| error.to_string())?;
  let source = fs::canonicalize(source).map_err(|error| error.to_string())?;
  let destination = fs::canonicalize(destination).map_err(|error| error.to_string())?;
  if destination == source || destination.starts_with(&source) || source.starts_with(&destination) {
    return Err("Choose a folder outside the Groam data directory.".into());
  }
  Ok(())
}

fn with_backend_stopped<T>(
  app: &tauri::AppHandle,
  work: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
  let lock = app.try_state::<DataOpLock>();
  let _guard = lock
    .as_ref()
    .map(|state| state.0.lock().expect("data operation lock poisoned"));
  let managed = app.try_state::<RuntimeState>().is_some();
  if managed {
    stop_runtime(app);
    if backend_is_listening() {
      start_runtime(app)?;
      return Err(
        "Convex is still running; cannot change Groam data while the local backend is up.".into(),
      );
    }
  }
  let result = work();
  if managed {
    start_runtime(app)?;
  }
  result
}

#[derive(Clone)]
pub(crate) struct DataOpLock(Arc<Mutex<()>>);

/// Runs work while holding the export/restore lock so an update cannot restart mid-copy.
pub(crate) fn with_data_op_lock(
  app: &tauri::AppHandle,
  work: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
  let lock = app
    .try_state::<DataOpLock>()
    .ok_or_else(|| "Groam is not ready for updates yet.".to_string())?;
  let _guard = lock
    .0
    .try_lock()
    .map_err(|_| "Groam data is being exported or restored; try again in a moment.".to_string())?;
  work()
}

fn assert_packaged_data_ops() -> Result<(), String> {
  if cfg!(debug_assertions) {
    return Err(
      "Export and restore are only available in the packaged Groam app. Dev sessions use the repository .convex directory.".into(),
    );
  }
  Ok(())
}

#[tauri::command]
fn groam_data_dir_path(app: tauri::AppHandle) -> Result<String, String> {
  assert_packaged_data_ops()?;
  let lock = app.try_state::<DataOpLock>();
  let _guard = match lock.as_ref() {
    Some(state) => Some(
      state
        .0
        .try_lock()
        .map_err(|_| "Groam data is being exported or restored; try again in a moment.")?,
    ),
    None => None,
  };
  groam_data_dir_opts(&app, false).map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn export_groam_data(app: tauri::AppHandle) -> Result<bool, String> {
  assert_packaged_data_ops()?;
  let Some(destination) = pick_directory(&app, "Export Groam data") else {
    return Ok(false);
  };
  export_groam_data_to(&app, &destination)?;
  Ok(true)
}

#[tauri::command]
fn import_groam_data(app: tauri::AppHandle) -> Result<bool, String> {
  assert_packaged_data_ops()?;
  let Some(source) = pick_directory(&app, "Restore Groam data") else {
    return Ok(false);
  };
  restore_groam_data(&app, &source)?;
  Ok(true)
}

fn pick_directory(app: &tauri::AppHandle, title: &str) -> Option<PathBuf> {
  app
    .dialog()
    .file()
    .set_title(title)
    .blocking_pick_folder()
    .and_then(file_path_to_pathbuf)
}

fn show_data_error(app: &tauri::AppHandle, title: &str, error: impl std::fmt::Display) {
  log::error!("{title}: {error}");
  app
    .dialog()
    .message(error.to_string())
    .kind(MessageDialogKind::Error)
    .title(title)
    .show(|_| {});
}

fn export_from_menu(app: &tauri::AppHandle) {
  if let Err(error) = export_groam_data(app.clone()).map(|_| ()) {
    show_data_error(app, "Unable to export Groam data", error);
  }
}

fn import_from_menu(app: &tauri::AppHandle) {
  if let Err(error) = import_groam_data(app.clone()).map(|_| ()) {
    show_data_error(app, "Unable to restore Groam data", error);
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      groam_data_dir_path,
      export_groam_data,
      import_groam_data
    ])
    .setup(|app| {
      app.manage(DataOpLock(Arc::new(Mutex::new(()))));

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
        return Ok(());
      }

      let export_item = tauri::menu::MenuItem::with_id(app, "export-data", "Export data…", true, None::<&str>)?;
      let import_item = tauri::menu::MenuItem::with_id(app, "import-data", "Restore data…", true, None::<&str>)?;
      let file_menu = tauri::menu::Submenu::with_items(app, "File", true, &[&export_item, &import_item])?;
      let menu = tauri::menu::Menu::with_items(app, &[&file_menu])?;
      app.set_menu(menu)?;

      let runtime = match spawn_runtime(app.handle(), true) {
        Ok(runtime) => runtime,
        Err(error) => {
          show_data_error(app.handle(), "Unable to start Groam", &error);
          return Err(error);
        }
      };
      app.manage(RuntimeState(runtime));
      updater::spawn_startup_check(app.handle());
      let handle = app.handle().clone();
      std::thread::spawn(move || {
        if let Err(error) = wait_for_app() {
          show_data_error(&handle, "Unable to start Groam", error);
          return;
        }
        if let Some(window) = handle.get_webview_window("main") {
          let _ = window.navigate(tauri::Url::parse(APP_URL).expect("valid app url"));
        }
      });
      Ok(())
    })
    .on_menu_event(|app, event| {
      if event.id() == "export-data" {
        export_from_menu(app);
      } else if event.id() == "import-data" {
        import_from_menu(app);
      }
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        stop_runtime(window.app_handle());
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
