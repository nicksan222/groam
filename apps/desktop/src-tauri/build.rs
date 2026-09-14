fn main() {
  tauri_build::try_build(
    tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
      "export_groam_data",
      "groam_data_dir_path",
      "import_groam_data",
    ])),
  )
  .expect("failed to run tauri-build");
}
