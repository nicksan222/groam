use std::{
  fs, io,
  path::{Path, PathBuf},
  time::{SystemTime, UNIX_EPOCH},
};

pub(crate) const RUNTIME_BUILD_STAMP: &str = ".groam-runtime-build";

pub(crate) fn copy_dir(source: &Path, destination: &Path) -> io::Result<()> {
  fs::create_dir_all(destination)?;
  for entry in fs::read_dir(source)? {
    let entry = entry?;
    let target = destination.join(entry.file_name());
    let source_path = entry.path();
    let file_type = entry.file_type()?;
    if file_type.is_symlink() {
      copy_symlink(&source_path, &target)?;
    } else if file_type.is_dir() {
      copy_dir(&source_path, &target)?;
    } else if file_type.is_file() {
      fs::copy(&source_path, target)?;
    }
  }
  Ok(())
}

fn copy_backup_dir(source: &Path, destination: &Path) -> io::Result<()> {
  fs::create_dir_all(destination)?;
  for entry in fs::read_dir(source)? {
    let entry = entry?;
    let file_type = entry.file_type()?;
    if file_type.is_symlink() {
      return Err(io::Error::new(
        io::ErrorKind::InvalidInput,
        "Backup trees cannot contain symbolic links",
      ));
    }
    let target = destination.join(entry.file_name());
    if file_type.is_dir() {
      copy_backup_dir(&entry.path(), &target)?;
    } else if file_type.is_file() {
      fs::copy(entry.path(), target)?;
    }
  }
  Ok(())
}

fn copy_symlink(source: &Path, destination: &Path) -> io::Result<()> {
  // Materialize links so a writable runtime copy does not depend on
  // read-only packaged resources (workspace node_modules, etc.).
  if source.is_dir() {
    copy_dir(source, destination)
  } else if source.is_file() {
    fs::copy(source, destination).map(|_| ())
  } else {
    Ok(())
  }
}

fn overlay_symlink(source: &Path, destination: &Path) -> io::Result<()> {
  if source.is_dir() {
    overlay_dir(source, destination)
  } else if source.is_file() {
    overlay_file(source, destination)
  } else {
    // Dangling or special: keep any existing materialized target.
    Ok(())
  }
}

fn overlay_file(source: &Path, destination: &Path) -> io::Result<()> {
  prepare_file_destination(destination)?;
  if let Some(parent) = destination.parent() {
    fs::create_dir_all(parent)?;
  }
  fs::copy(source, destination).map(|_| ())
}

fn prepare_directory(path: &Path) -> io::Result<()> {
  match fs::symlink_metadata(path) {
    Err(error) if error.kind() == io::ErrorKind::NotFound => fs::create_dir_all(path),
    Err(error) => Err(error),
    Ok(meta) if meta.file_type().is_dir() => Ok(()),
    Ok(_) => {
      remove_path(path)?;
      fs::create_dir_all(path)
    }
  }
}

fn prepare_file_destination(path: &Path) -> io::Result<()> {
  match fs::symlink_metadata(path) {
    Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(error),
    Ok(meta) if meta.file_type().is_file() => Ok(()),
    Ok(_) => remove_path(path),
  }
}

fn runtime_identity(root: &Path) -> io::Result<String> {
  let stamp = root.join(RUNTIME_BUILD_STAMP);
  if let Ok(contents) = fs::read_to_string(&stamp) {
    let trimmed = contents.trim();
    if !trimmed.is_empty() {
      return Ok(trimmed.to_string());
    }
  }
  let mut identity = String::new();
  for relative in ["package.json", "runtime/start.ts"] {
    let path = root.join(relative);
    if path.is_file() {
      identity.push_str(&fs::read_to_string(path)?);
      identity.push('\n');
    }
  }
  Ok(identity)
}

pub(crate) fn overlay_dir(source: &Path, destination: &Path) -> io::Result<()> {
  prepare_directory(destination)?;
  for entry in fs::read_dir(source)? {
    let entry = entry?;
    if entry.file_name() == RUNTIME_BUILD_STAMP {
      continue;
    }
    let target = destination.join(entry.file_name());
    let source_path = entry.path();
    let file_type = entry.file_type()?;
    if file_type.is_symlink() {
      overlay_symlink(&source_path, &target)?;
    } else if file_type.is_dir() {
      overlay_dir(&source_path, &target)?;
    } else if file_type.is_file() {
      overlay_file(&source_path, &target)?;
    }
  }
  Ok(())
}

fn remove_path(path: &Path) -> io::Result<()> {
  match fs::symlink_metadata(path) {
    Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
    Err(error) => Err(error),
    Ok(meta) if meta.file_type().is_dir() => fs::remove_dir_all(path),
    Ok(_) => fs::remove_file(path)
  }
}

/// Copy a packaged runtime tree into a writable app-data directory when the
/// staged snapshot is missing or from a different build. Destination-only
/// files such as `.env.local` are left in place.
pub(crate) fn sync_writable_runtime(staged: &Path, writable: &Path) -> io::Result<()> {
  if !staged.is_dir() {
    return Err(io::Error::new(
      io::ErrorKind::NotFound,
      format!(
        "Packaged Groam runtime is missing at {}",
        staged.display()
      ),
    ));
  }
  let staged_id = runtime_identity(staged)?;
  if writable.is_dir() {
    let writable_id = runtime_identity(writable)?;
    if !staged_id.is_empty() && writable_id == staged_id {
      return Ok(());
    }
  }
  overlay_dir(staged, writable)?;
  prune_untracked(staged, writable)?;
  write_runtime_stamp(staged, writable)
}

fn is_preserved_local_state(name: &std::ffi::OsStr) -> bool {
  name == ".convex" || name == ".env.local" || name == ".env" || name == RUNTIME_BUILD_STAMP
}

fn prune_untracked(staged: &Path, writable: &Path) -> io::Result<()> {
  if !writable.is_dir() {
    return Ok(());
  }
  let entries = fs::read_dir(writable)?.collect::<io::Result<Vec<_>>>()?;
  for entry in entries {
    let name = entry.file_name();
    if is_preserved_local_state(&name) {
      continue;
    }
    let dest = writable.join(&name);
    let src = staged.join(&name);
    if fs::symlink_metadata(&src).is_err() {
      remove_path(&dest)?;
      continue;
    }
    let dest_meta = fs::symlink_metadata(&dest)?;
    let src_meta = fs::symlink_metadata(&src)?;
    if dest_meta.file_type().is_dir() && src_meta.file_type().is_dir() {
      prune_untracked(&src, &dest)?;
    }
  }
  Ok(())
}

fn write_runtime_stamp(staged: &Path, writable: &Path) -> io::Result<()> {
  let staged_stamp = staged.join(RUNTIME_BUILD_STAMP);
  if staged_stamp.is_file() {
    fs::copy(&staged_stamp, writable.join(RUNTIME_BUILD_STAMP))?;
  }
  Ok(())
}

pub(crate) fn recover_pointer(parent: &Path, name: &std::ffi::OsStr) -> PathBuf {
  parent.join(format!("{}.recover", name.to_string_lossy()))
}

fn is_empty_dir(path: &Path) -> io::Result<bool> {
  if !path.is_dir() {
    return Ok(false);
  }
  Ok(fs::read_dir(path)?.next().is_none())
}

pub(crate) fn recover_interrupted_dir(parent: &Path, name: &str) -> io::Result<()> {
  let data_dir = parent.join(name);
  let pointer = recover_pointer(parent, name.as_ref());
  if data_dir.is_dir() {
    if is_empty_dir(&data_dir)? && pointer.is_file() {
      fs::remove_dir(&data_dir)?;
    } else if pointer.is_file() {
      let raw = fs::read_to_string(&pointer)?;
      let backup = PathBuf::from(raw.trim());
      if backup.exists() {
        // Unconfirmed keep-previous swap: imported dest is live but not healthy yet.
        let orphan = unique_sibling(parent, name.as_ref(), "orphaned")?;
        fs::rename(&data_dir, &orphan)?;
        fs::rename(&backup, &data_dir)?;
        let _ = fs::remove_dir_all(&orphan);
        let _ = fs::remove_file(&pointer);
        return Ok(());
      }
      let _ = fs::remove_file(&pointer);
      return Ok(());
    } else {
      return Ok(());
    }
  }
  if pointer.is_file() {
    let raw = fs::read_to_string(&pointer)?;
    let backup = PathBuf::from(raw.trim());
    if backup.exists() {
      fs::rename(&backup, &data_dir)?;
    }
    let _ = fs::remove_file(&pointer);
    return Ok(());
  }
  let legacy = parent.join(format!("{name}.previous"));
  if legacy.exists() {
    fs::rename(&legacy, &data_dir)?;
  }
  Ok(())
}

pub(crate) fn recover_interrupted_data_dir(parent: &Path, name: &str) -> Result<(), String> {
  recover_interrupted_dir(parent, name).map_err(|error| error.to_string())
}

pub(crate) fn unique_sibling(
  parent: &Path,
  name: &std::ffi::OsStr,
  suffix: &str
) -> io::Result<PathBuf> {
  let nonce = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_nanos())
    .unwrap_or(0);
  let path = parent.join(format!(
    "{}.{:x}-{nonce:x}.{suffix}",
    name.to_string_lossy(),
    std::process::id()
  ));
  if path.exists() {
    return Err(io::Error::new(
      io::ErrorKind::AlreadyExists,
      "A temporary Groam folder already exists; try the export again.",
    ));
  }
  Ok(path)
}

fn assert_replace_source_is_separate(source: &Path, destination: &Path) -> io::Result<()> {
  let source = fs::canonicalize(source)?;
  if !destination.exists() {
    return Ok(());
  }
  let destination = fs::canonicalize(destination)?;
  if destination == source || destination.starts_with(&source) || source.starts_with(&destination)
  {
    return Err(io::Error::new(
      io::ErrorKind::InvalidInput,
      "Backup source cannot contain the live data directory",
    ));
  }
  Ok(())
}

pub(crate) fn replace_dir(source: &Path, destination: &Path) -> io::Result<()> {
  let _ = replace_dir_inner(source, destination, false)?;
  Ok(())
}

/// Swap `destination` to `source`, but keep the previous tree so a caller can
/// roll back if the replacement is not actually usable yet.
pub(crate) fn replace_dir_keep_previous(
  source: &Path,
  destination: &Path,
) -> io::Result<Option<PathBuf>> {
  replace_dir_inner(source, destination, true)
}

fn replace_dir_inner(
  source: &Path,
  destination: &Path,
  keep_previous: bool,
) -> io::Result<Option<PathBuf>> {
  assert_replace_source_is_separate(source, destination)?;
  let parent = destination.parent().ok_or_else(|| {
    io::Error::new(
      io::ErrorKind::InvalidInput,
      "Groam data directory has no parent",
    )
  })?;
  let name = destination.file_name().ok_or_else(|| {
    io::Error::new(
      io::ErrorKind::InvalidInput,
      "Groam data directory has no name",
    )
  })?;
  recover_interrupted_dir(parent, &name.to_string_lossy())?;
  let staging = unique_sibling(parent, name, "importing")?;
  if let Err(error) = copy_backup_dir(source, &staging) {
    let _ = fs::remove_dir_all(&staging);
    return Err(error);
  }
  if !destination.exists() {
    fs::rename(&staging, destination)?;
    return Ok(None);
  }
  let backup = unique_sibling(parent, name, "previous")?;
  let pointer = recover_pointer(parent, name);
  fs::write(&pointer, backup.to_string_lossy().as_bytes())?;
  fs::rename(destination, &backup)?;
  if let Err(error) = fs::rename(&staging, destination) {
    return Err(finish_failed_swap(&backup, destination, &pointer, error));
  }
  if keep_previous {
    return Ok(Some(backup));
  }
  match fs::remove_file(&pointer) {
    Ok(()) => {}
    Err(error) if error.kind() == io::ErrorKind::NotFound => {}
    Err(error) => return Err(error),
  }
  let _ = fs::remove_dir_all(&backup);
  Ok(None)
}

pub(crate) fn finish_failed_swap(
  backup: &Path,
  destination: &Path,
  pointer: &Path,
  error: io::Error,
) -> io::Error {
  let _ = fs::rename(backup, destination);
  // Keep the pointer unless the live folder is a directory again. A failed
  // rollback leaves the database in the unique `.previous` sibling.
  if destination.is_dir() {
    let _ = fs::remove_file(pointer);
  }
  error
}

#[cfg(test)]
mod tests {
  use super::{
    copy_dir, finish_failed_swap, overlay_dir, recover_interrupted_data_dir, recover_pointer,
    replace_dir, replace_dir_keep_previous, sync_writable_runtime,
  };
  use std::{
    fs, io,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
  };

  fn temp_parent() -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
      "groam-data-dir-test-{}-{}",
      std::process::id(),
      SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos()
    ));
    fs::create_dir_all(&dir).expect("temp parent");
    dir
  }

  fn write_marker(dir: &std::path::Path, contents: &str) {
    fs::create_dir_all(dir).expect("dir");
    fs::write(dir.join("backend.sqlite3"), contents).expect("marker");
  }

  #[test]
  fn keeps_recover_pointer_when_rollback_cannot_restore_live_dir() {
    let parent = temp_parent();
    let destination = parent.join("groam-data");
    let backup = parent.join("groam-data.1-abc.previous");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    write_marker(&backup, "live-db");
    fs::write(&pointer, backup.to_string_lossy().as_bytes()).expect("pointer");
    fs::write(&destination, b"occupied").expect("blocking file");

    let error = finish_failed_swap(
      &backup,
      &destination,
      &pointer,
      io::Error::new(io::ErrorKind::Other, "install failed"),
    );
    assert_eq!(error.kind(), io::ErrorKind::Other);
    assert!(pointer.is_file(), "pointer must survive a failed rollback");
    assert!(backup.is_dir(), "unique backup must stay findable");
    assert!(destination.is_file());

    fs::remove_file(&destination).expect("clear blocker");
    recover_interrupted_data_dir(&parent, "groam-data").expect("recover");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("restored"),
      "live-db"
    );
    assert!(!pointer.exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn drops_recover_pointer_after_successful_rollback() {
    let parent = temp_parent();
    let destination = parent.join("groam-data");
    let backup = parent.join("groam-data.1-abc.previous");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    write_marker(&backup, "live-db");
    fs::write(&pointer, backup.to_string_lossy().as_bytes()).expect("pointer");

    finish_failed_swap(
      &backup,
      &destination,
      &pointer,
      io::Error::new(io::ErrorKind::Other, "install failed"),
    );
    assert!(destination.is_dir());
    assert!(!pointer.exists());
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("rolled back"),
      "live-db"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn replace_dir_removes_pointer_after_successful_swap() {
    let parent = temp_parent();
    let source = parent.join("export");
    let destination = parent.join("groam-data");
    write_marker(&source, "imported");
    write_marker(&destination, "live-db");

    replace_dir(&source, &destination).expect("replace");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("imported"),
      "imported"
    );
    assert!(!recover_pointer(&parent, destination.file_name().expect("name")).exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn recover_interrupted_export_restores_named_folder() {
    let parent = temp_parent();
    let destination = parent.join("Groam Backup");
    let backup = parent.join("Groam Backup.1-abc.previous");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    write_marker(&backup, "old-export");
    fs::write(&pointer, backup.to_string_lossy().as_bytes()).expect("pointer");

    recover_interrupted_data_dir(&parent, "Groam Backup").expect("recover");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("restored"),
      "old-export"
    );
    assert!(!pointer.exists());
    assert!(!backup.exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn recover_treats_empty_destination_as_missing_when_pointer_exists() {
    let parent = temp_parent();
    let destination = parent.join("Groam Backup");
    let backup = parent.join("Groam Backup.1-abc.previous");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    fs::create_dir_all(&destination).expect("empty dest");
    write_marker(&backup, "old-export");
    fs::write(&pointer, backup.to_string_lossy().as_bytes()).expect("pointer");

    recover_interrupted_data_dir(&parent, "Groam Backup").expect("recover");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("restored"),
      "old-export"
    );
    assert!(!pointer.exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn recover_rolls_back_unconfirmed_keep_previous_swap() {
    let parent = temp_parent();
    let destination = parent.join("groam-data");
    let backup = parent.join("groam-data.1-abc.previous");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    write_marker(&destination, "imported");
    write_marker(&backup, "live-db");
    fs::write(&pointer, backup.to_string_lossy().as_bytes()).expect("pointer");

    recover_interrupted_data_dir(&parent, "groam-data").expect("recover");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("rolled back"),
      "live-db"
    );
    assert!(!pointer.exists());
    assert!(!backup.exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn replace_dir_keep_previous_leaves_old_tree_until_caller_removes_it() {
    let parent = temp_parent();
    let source = parent.join("export");
    let destination = parent.join("groam-data");
    write_marker(&source, "imported");
    write_marker(&destination, "live-db");

    let previous = replace_dir_keep_previous(&source, &destination).expect("replace");
    let previous = previous.expect("previous tree");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("imported"),
      "imported"
    );
    assert_eq!(
      fs::read_to_string(previous.join("backend.sqlite3")).expect("kept"),
      "live-db"
    );
    assert!(recover_pointer(&parent, destination.file_name().expect("name")).is_file());
    recover_interrupted_data_dir(&parent, "groam-data").expect("recover");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("rolled back"),
      "live-db"
    );
    assert!(!previous.exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn recover_leaves_confirmed_swap_when_pointer_is_gone() {
    let parent = temp_parent();
    let source = parent.join("export");
    let destination = parent.join("groam-data");
    write_marker(&source, "imported");
    write_marker(&destination, "live-db");

    let previous = replace_dir_keep_previous(&source, &destination).expect("replace");
    let previous = previous.expect("previous tree");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    fs::remove_file(&pointer).expect("confirm swap");

    recover_interrupted_data_dir(&parent, "groam-data").expect("recover");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("kept import"),
      "imported"
    );
    assert_eq!(
      fs::read_to_string(previous.join("backend.sqlite3")).expect("orphan previous"),
      "live-db"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn replace_dir_recovers_interrupted_export_before_overwrite() {
    let parent = temp_parent();
    let source = parent.join("live");
    let destination = parent.join("Groam Backup");
    let backup = parent.join("Groam Backup.1-abc.previous");
    let pointer = recover_pointer(&parent, destination.file_name().expect("name"));
    write_marker(&source, "new-export");
    write_marker(&backup, "old-export");
    fs::write(&pointer, backup.to_string_lossy().as_bytes()).expect("pointer");

    replace_dir(&source, &destination).expect("replace");
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("replaced"),
      "new-export"
    );
    assert!(!pointer.exists());
    assert!(!backup.exists());
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn replace_dir_rejects_source_that_contains_destination() {
    let parent = temp_parent();
    let destination = parent.join("groam-data");
    write_marker(&parent, "backup");
    write_marker(&destination, "live-db");

    let error = replace_dir(&parent, &destination).expect_err("nested source");
    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("unchanged"),
      "live-db"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn replace_dir_rejects_symlinks_in_source() {
    let parent = temp_parent();
    let source = parent.join("export");
    let destination = parent.join("groam-data");
    write_marker(&source, "imported");
    write_marker(&destination, "live-db");
    std::os::unix::fs::symlink(&destination, source.join("loop")).expect("symlink");

    let error = replace_dir(&source, &destination).expect_err("symlink backup");
    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    assert_eq!(
      fs::read_to_string(destination.join("backend.sqlite3")).expect("unchanged"),
      "live-db"
    );
    let leftovers: Vec<_> = fs::read_dir(&parent)
      .expect("parent")
      .filter_map(Result::ok)
      .map(|entry| entry.file_name().to_string_lossy().into_owned())
      .filter(|name| name.contains("importing"))
      .collect();
    assert!(leftovers.is_empty(), "{leftovers:?}");
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn copy_dir_materializes_symlinks() {
    let parent = temp_parent();
    let source = parent.join("staged");
    let dest = parent.join("writable");
    fs::create_dir_all(source.join("packages")).expect("packages");
    fs::write(source.join("packages/app.txt"), "from-package").expect("package file");
    fs::create_dir_all(source.join("node_modules")).expect("node_modules");
    std::os::unix::fs::symlink(
      "../packages/app.txt",
      source.join("node_modules/app.txt"),
    )
    .expect("symlink");

    copy_dir(&source, &dest).expect("copy");
    assert_eq!(
      fs::read_to_string(dest.join("node_modules/app.txt")).expect("copied link"),
      "from-package"
    );
    assert!(
      fs::symlink_metadata(dest.join("node_modules/app.txt"))
        .expect("meta")
        .file_type()
        .is_file()
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn sync_writable_runtime_copies_and_preserves_local_state() {
    let parent = temp_parent();
    let staged = parent.join("staged");
    let writable = parent.join("writable");
    fs::create_dir_all(&staged).expect("staged");
    fs::write(staged.join(".groam-runtime-build"), "build-1\n").expect("stamp");
    fs::write(staged.join("start.txt"), "v1").expect("start");

    sync_writable_runtime(&staged, &writable).expect("first sync");
    assert_eq!(fs::read_to_string(writable.join("start.txt")).expect("v1"), "v1");

    fs::write(writable.join(".env.local"), "SECRET=1").expect("env");
    sync_writable_runtime(&staged, &writable).expect("skip matching build");
    assert_eq!(
      fs::read_to_string(writable.join(".env.local")).expect("kept env"),
      "SECRET=1"
    );

    fs::write(staged.join(".groam-runtime-build"), "build-2\n").expect("new stamp");
    fs::write(staged.join("start.txt"), "v2").expect("start v2");
    sync_writable_runtime(&staged, &writable).expect("overlay newer build");
    assert_eq!(fs::read_to_string(writable.join("start.txt")).expect("v2"), "v2");
    assert_eq!(
      fs::read_to_string(writable.join(".env.local")).expect("env after update"),
      "SECRET=1"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn overlay_dir_defers_build_stamp_until_sync_finishes() {
    let parent = temp_parent();
    let staged = parent.join("staged");
    let writable = parent.join("writable");
    fs::create_dir_all(&staged).expect("staged");
    fs::write(staged.join(".groam-runtime-build"), "build-1\n").expect("stamp");
    fs::write(staged.join("start.txt"), "v1").expect("start");

    overlay_dir(&staged, &writable).expect("overlay");
    assert!(
      !writable.join(".groam-runtime-build").exists(),
      "partial overlay must not look up to date"
    );
    assert_eq!(fs::read_to_string(writable.join("start.txt")).expect("v1"), "v1");

    sync_writable_runtime(&staged, &writable).expect("sync");
    assert_eq!(
      fs::read_to_string(writable.join(".groam-runtime-build")).expect("stamp"),
      "build-1\n"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn overlay_keeps_materialized_target_when_staged_link_is_dangling() {
    let parent = temp_parent();
    let staged = parent.join("staged");
    let writable = parent.join("writable");
    fs::create_dir_all(staged.join("node_modules")).expect("staged modules");
    std::os::unix::fs::symlink(
      "../missing/pkg",
      staged.join("node_modules/pkg"),
    )
    .expect("dangling");
    fs::create_dir_all(writable.join("node_modules")).expect("writable modules");
    fs::write(writable.join("node_modules/pkg"), "kept").expect("materialized");

    overlay_dir(&staged, &writable).expect("overlay");
    assert_eq!(
      fs::read_to_string(writable.join("node_modules/pkg")).expect("kept"),
      "kept"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn overlay_replaces_mismatched_file_and_directory() {
    let parent = temp_parent();
    let staged = parent.join("staged");
    let writable = parent.join("writable");
    fs::create_dir_all(staged.join("tooling")).expect("staged dir");
    fs::write(staged.join("tooling/start.ts"), "ok").expect("nested");
    fs::write(staged.join("notes"), "from-file").expect("staged file");
    fs::create_dir_all(&writable).expect("writable");
    fs::write(writable.join("tooling"), "was-a-file").expect("file where dir belongs");
    fs::create_dir_all(writable.join("notes")).expect("dir where file belongs");

    overlay_dir(&staged, &writable).expect("overlay");
    assert_eq!(
      fs::read_to_string(writable.join("tooling/start.ts")).expect("dir"),
      "ok"
    );
    assert_eq!(
      fs::read_to_string(writable.join("notes")).expect("file"),
      "from-file"
    );
    fs::remove_dir_all(&parent).ok();
  }

  #[test]
  fn sync_removes_retired_runtime_files_and_keeps_local_state() {
    let parent = temp_parent();
    let staged = parent.join("staged");
    let writable = parent.join("writable");
    fs::create_dir_all(staged.join("routes")).expect("staged routes");
    fs::write(staged.join(".groam-runtime-build"), "build-2\n").expect("stamp");
    fs::write(staged.join("routes/live.ts"), "new").expect("live");
    fs::create_dir_all(writable.join("routes")).expect("writable routes");
    fs::write(writable.join(".groam-runtime-build"), "build-1\n").expect("old stamp");
    fs::write(writable.join("routes/live.ts"), "old").expect("old live");
    fs::write(writable.join("routes/retired.ts"), "stale").expect("retired");
    fs::write(writable.join(".env.local"), "SECRET=1").expect("env");

    sync_writable_runtime(&staged, &writable).expect("sync");
    assert_eq!(
      fs::read_to_string(writable.join("routes/live.ts")).expect("updated"),
      "new"
    );
    assert!(!writable.join("routes/retired.ts").exists());
    assert_eq!(
      fs::read_to_string(writable.join(".env.local")).expect("kept env"),
      "SECRET=1"
    );
    fs::remove_dir_all(&parent).ok();
  }
}
