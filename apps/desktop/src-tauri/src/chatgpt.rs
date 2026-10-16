use std::process::{Command, Stdio};

fn validate_authorization_url(value: &str) -> Result<(), String> {
  let url = reqwest::Url::parse(value).map_err(|_| "Invalid ChatGPT authorization URL.")?;
  if url.scheme() != "https"
    || url.host_str() != Some("auth.openai.com")
    || url.port().is_some()
    || !url.username().is_empty()
    || url.password().is_some()
    || url.path() != "/api/accounts/authorize"
    || url.fragment().is_some()
  {
    return Err("Invalid ChatGPT authorization URL.".into());
  }
  Ok(())
}

/// Open only the official OAuth endpoint, never an arbitrary command or URL.
#[tauri::command]
pub fn open_chatgpt_authorization(url: String) -> Result<(), String> {
  validate_authorization_url(&url)?;
  #[cfg(target_os = "macos")]
  let mut command = {
    let mut command = Command::new("open");
    command.arg("--");
    command
  };
  #[cfg(target_os = "windows")]
  let mut command = Command::new("explorer.exe");
  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  let mut command = Command::new("xdg-open");
  command
    .arg(url)
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .map_err(|_| "Unable to open the system browser for ChatGPT sign-in.".to_string())?;
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::validate_authorization_url;

  #[test]
  fn accepts_only_the_official_authorization_endpoint() {
    assert!(validate_authorization_url("https://auth.openai.com/api/accounts/authorize?state=random").is_ok());
    for url in [
      "http://auth.openai.com/api/accounts/authorize",
      "https://auth.openai.com.evil.example/api/accounts/authorize",
      "https://user:password@auth.openai.com/api/accounts/authorize",
      "https://auth.openai.com/api/accounts/oauth/token",
      "file:///tmp/command",
      "https://auth.openai.com:444/api/accounts/authorize",
    ] {
      assert!(validate_authorization_url(url).is_err());
    }
  }
}
