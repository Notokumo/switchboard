use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize)]
struct Registration {
    url: String,
    version: Option<String>,
    pid: Option<u32>,
    password: Option<String>,
}

#[derive(Debug, Serialize)]
struct ServiceInfo {
    url: String,
    version: String,
    pid: u32,
}

#[derive(Debug, Serialize)]
struct ConfigFile {
    path: String,
    exists: bool,
    content: String,
    backups: String,
}

#[derive(Debug, Serialize)]
struct WriteResult {
    path: String,
    backup: Option<String>,
}

fn home() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Could not resolve the home directory".to_string())
}

fn registration_path() -> Result<PathBuf, String> {
    Ok(home()?
        .join(".local")
        .join("state")
        .join("opencode")
        .join("service.json"))
}

fn config_candidates() -> Result<Vec<PathBuf>, String> {
    let base = home()?.join(".config").join("opencode");

    Ok(vec![base.join("opencode.jsonc"), base.join("opencode.json")])
}

fn active_config_path() -> Result<PathBuf, String> {
    let candidates = config_candidates()?;

    if let Some(found) = candidates.iter().find(|path| path.exists()) {
        return Ok(found.clone());
    }

    Ok(candidates[0].clone())
}

fn read_registration() -> Result<Registration, String> {
    let path = registration_path()?;
    let raw = fs::read_to_string(&path).map_err(|error| {
        format!(
            "OpenCode background service is not registered at {}: {}. Start it with `opencode service start`.",
            path.display(),
            error
        )
    })?;

    serde_json::from_str(&raw).map_err(|error| format!("Invalid service registration: {error}"))
}

fn timestamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[tauri::command]
fn oc_service_info() -> Result<ServiceInfo, String> {
    let registration = read_registration()?;

    Ok(ServiceInfo {
        url: registration.url,
        version: registration.version.unwrap_or_default(),
        pid: registration.pid.unwrap_or(0),
    })
}

fn ensure_api_path(path: &str) -> Result<(), String> {
    let allowed = path.starts_with("/api/")
        && !path.contains("..")
        && !path.contains("//")
        && !path.contains('?')
        && !path.contains('#')
        && !path.contains('\\')
        && !path.chars().any(|c| c.is_control() || c.is_whitespace());

    if allowed {
        Ok(())
    } else {
        Err(format!("Refused non-API path: {path}"))
    }
}

fn ensure_loopback(url: &str) -> Result<(), String> {
    let parsed = reqwest::Url::parse(url).map_err(|error| format!("Invalid service URL: {error}"))?;

    match parsed.host_str() {
        Some("127.0.0.1") | Some("localhost") | Some("[::1]") => Ok(()),
        other => Err(format!(
            "Refused to send credentials to a non-local host: {}",
            other.unwrap_or("(none)")
        )),
    }
}

#[tauri::command]
async fn oc_request(method: String, path: String, body: Option<Value>) -> Result<Value, String> {
    ensure_api_path(&path)?;

    let registration = read_registration()?;
    ensure_loopback(&registration.url)?;
    let url = format!("{}{}", registration.url.trim_end_matches('/'), path);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        other => return Err(format!("Unsupported method: {other}")),
    };

    request = request.basic_auth(
        "opencode",
        Some(registration.password.unwrap_or_default()),
    );

    if let Some(payload) = body {
        request = request.json(&payload);
    }

    let response = request
        .send()
        .await
        .map_err(|error| format!("Could not reach the OpenCode server: {error}"))?;
    let status = response.status();
    let text = response.text().await.map_err(|error| error.to_string())?;

    if !status.is_success() {
        let detail = text.trim();

        if detail.is_empty() {
            return Err(format!("OpenCode server returned HTTP {}", status.as_u16()));
        }

        return Err(format!("HTTP {}: {}", status.as_u16(), detail));
    }

    if text.trim().is_empty() {
        return Ok(Value::Null);
    }

    serde_json::from_str(&text).map_err(|error| format!("Invalid JSON from the server: {error}"))
}

#[tauri::command]
fn oc_config_read() -> Result<ConfigFile, String> {
    let path = active_config_path()?;
    let content = if path.exists() {
        fs::read_to_string(&path).map_err(|error| error.to_string())?
    } else {
        String::new()
    };

    let backups = path
        .parent()
        .map(|parent| parent.join(".switchboard-backups"))
        .unwrap_or_else(|| PathBuf::from(".switchboard-backups"));

    Ok(ConfigFile {
        path: path.display().to_string(),
        exists: path.exists(),
        content,
        backups: backups.display().to_string(),
    })
}

#[tauri::command]
fn oc_config_write(content: String) -> Result<WriteResult, String> {
    let path = active_config_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "Configuration path has no parent directory".to_string())?;

    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let backup = if path.exists() {
        let backups = parent.join(".switchboard-backups");
        fs::create_dir_all(&backups).map_err(|error| error.to_string())?;

        let target = backups.join(format!("opencode-{}.jsonc", timestamp()));
        fs::copy(&path, &target).map_err(|error| error.to_string())?;
        Some(target)
    } else {
        None
    };

    let temporary = parent.join(format!(".opencode-{}.tmp", timestamp()));
    fs::write(&temporary, &content).map_err(|error| error.to_string())?;

    if let Err(error) = fs::rename(&temporary, &path) {
        fs::remove_file(&temporary).ok();
        return Err(error.to_string());
    }

    Ok(WriteResult {
        path: path.display().to_string(),
        backup: backup.map(|value| value.display().to_string()),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            oc_service_info,
            oc_request,
            oc_config_read,
            oc_config_write
        ])
        .run(tauri::generate_context!())
        .expect("error while running Switchboard");
}
