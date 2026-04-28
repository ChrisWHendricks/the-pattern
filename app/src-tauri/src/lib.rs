#![allow(unexpected_cfgs)]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[cfg(target_os = "macos")]
use std::os::raw::c_void;

/// Set to true by stop_speaking_native; polled by speak_text loop to abort.
static STOP_SPEAKING: AtomicBool = AtomicBool::new(false);

/// ObjC blocks start with: isa*, flags(i32), reserved(i32), invoke fn*
/// We read the invoke pointer and call it directly.
#[cfg(target_os = "macos")]
#[repr(C)]
struct BlockLiteral {
    isa: *const c_void,
    flags: i32,
    reserved: i32,
    invoke: *const c_void,
}

#[cfg(target_os = "macos")]
unsafe fn call_block_usize(block: *mut c_void, arg: usize) {
    type Fn = unsafe extern "C" fn(*mut c_void, usize);
    let invoke: Fn = std::mem::transmute((*(block as *mut BlockLiteral)).invoke);
    invoke(block, arg);
}

// ── Atlassian OAuth in-flight state ─────────────────────────────────────────

#[derive(Default)]
struct AtlassianOAuthState {
    code_verifier: Option<String>,
    state_param: Option<String>,
}

#[derive(serde::Serialize)]
struct StartOAuthResponse {
    auth_url: String,
    client_id: String,
}

#[derive(serde::Serialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
    client_id: String,
}

/// Start the Atlassian OAuth flow. Registers a dynamic client if no client_id
/// is provided, generates PKCE, and returns the authorization URL + client_id.
#[tauri::command]
async fn atlassian_start_oauth(
    existing_client_id: Option<String>,
    app_state: tauri::State<'_, Mutex<AtlassianOAuthState>>,
) -> Result<StartOAuthResponse, String> {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
    use rand::RngCore;
    use sha2::{Digest, Sha256};

    let client_id = match existing_client_id {
        Some(id) if !id.is_empty() => id,
        _ => {
            let http = reqwest::Client::new();
            let body = serde_json::json!({
                "client_name": "The Pattern",
                "redirect_uris": ["thepattern://atlassian/callback"],
                "grant_types": ["authorization_code", "refresh_token"],
                "token_endpoint_auth_method": "none"
            });
            let resp = http
                .post("https://cf.mcp.atlassian.com/v1/register")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            json["client_id"]
                .as_str()
                .ok_or("no client_id in registration response")?
                .to_owned()
        }
    };

    let mut verifier_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut verifier_bytes);
    let code_verifier = URL_SAFE_NO_PAD.encode(&verifier_bytes);

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let code_challenge = URL_SAFE_NO_PAD.encode(&hasher.finalize());

    let mut state_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut state_bytes);
    let state_param = URL_SAFE_NO_PAD.encode(&state_bytes);

    {
        let mut s = app_state.lock().unwrap();
        s.code_verifier = Some(code_verifier);
        s.state_param = Some(state_param.clone());
    }

    let auth_url = format!(
        "https://mcp.atlassian.com/v1/authorize?response_type=code&client_id={}&redirect_uri={}&code_challenge={}&code_challenge_method=S256&state={}",
        urlencoding::encode(&client_id),
        urlencoding::encode("thepattern://atlassian/callback"),
        urlencoding::encode(&code_challenge),
        urlencoding::encode(&state_param),
    );

    Ok(StartOAuthResponse { auth_url, client_id })
}

/// Exchange the authorization code for tokens. Verifies the state param (CSRF).
#[tauri::command]
async fn atlassian_exchange_code(
    code: String,
    state_received: String,
    client_id: String,
    app_state: tauri::State<'_, Mutex<AtlassianOAuthState>>,
) -> Result<TokenResponse, String> {
    let (code_verifier, stored_state) = {
        let s = app_state.lock().unwrap();
        (
            s.code_verifier.clone().ok_or("no code_verifier in state")?,
            s.state_param.clone().ok_or("no state_param in state")?,
        )
    };

    if stored_state != state_received {
        return Err("state mismatch — possible CSRF attack".into());
    }

    let http = reqwest::Client::new();
    let params = vec![
        ("grant_type", "authorization_code"),
        ("code", code.as_str()),
        ("redirect_uri", "thepattern://atlassian/callback"),
        ("client_id", client_id.as_str()),
        ("code_verifier", code_verifier.as_str()),
    ];

    let resp = http
        .post("https://cf.mcp.atlassian.com/v1/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = json["error"].as_str() {
        return Err(format!(
            "token error: {} — {}",
            err,
            json["error_description"].as_str().unwrap_or("(no description)")
        ));
    }

    // Clear in-flight state
    {
        let mut s = app_state.lock().unwrap();
        s.code_verifier = None;
        s.state_param = None;
    }

    Ok(TokenResponse {
        access_token: json["access_token"]
            .as_str()
            .ok_or("no access_token in response")?
            .to_owned(),
        refresh_token: json["refresh_token"].as_str().map(|s| s.to_owned()),
        expires_in: json["expires_in"].as_u64().unwrap_or(3600),
        client_id,
    })
}

/// Refresh an Atlassian access token using a stored refresh token.
#[tauri::command]
async fn atlassian_refresh_token(
    refresh_token: String,
    client_id: String,
) -> Result<TokenResponse, String> {
    let http = reqwest::Client::new();
    let params = vec![
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token.as_str()),
        ("client_id", client_id.as_str()),
    ];

    let resp = http
        .post("https://cf.mcp.atlassian.com/v1/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(err) = json["error"].as_str() {
        return Err(format!(
            "refresh error: {} — {}",
            err,
            json["error_description"].as_str().unwrap_or("(no description)")
        ));
    }

    Ok(TokenResponse {
        access_token: json["access_token"]
            .as_str()
            .ok_or("no access_token in response")?
            .to_owned(),
        refresh_token: json["refresh_token"].as_str().map(|s| s.to_owned()),
        expires_in: json["expires_in"].as_u64().unwrap_or(3600),
        client_id,
    })
}

// ── Jira REST API commands ────────────────────────────────────────────────────

fn jira_api_base(jira_base_url: &str) -> String {
    // Strip /browse/... suffix to get the root: "https://host/browse/" → "https://host"
    if let Some(idx) = jira_base_url.find("/browse") {
        jira_base_url[..idx].to_owned()
    } else {
        jira_base_url.trim_end_matches('/').to_owned()
    }
}

fn jira_auth_header(email: &str, token: &str) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    format!("Basic {}", STANDARD.encode(format!("{}:{}", email, token)))
}

/// Search Jira issues using JQL. Returns a compact JSON summary.
#[tauri::command]
async fn jira_search(
    base_url: String,
    email: String,
    api_token: String,
    jql: String,
    max_results: Option<u32>,
) -> Result<String, String> {
    let api_base = jira_api_base(&base_url);
    let max = max_results.unwrap_or(10).to_string();
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/rest/api/2/search", api_base))
        .header("Authorization", jira_auth_header(&email, &api_token))
        .header("Accept", "application/json")
        .query(&[
            ("jql", jql.as_str()),
            ("maxResults", max.as_str()),
            ("fields", "summary,status,assignee,priority,issuetype"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Jira API error: {}", e))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let total = json["total"].as_u64().unwrap_or(0);
    let issues: Vec<serde_json::Value> = json["issues"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|i| {
                    let f = &i["fields"];
                    serde_json::json!({
                        "key": i["key"].as_str().unwrap_or(""),
                        "summary": f["summary"].as_str().unwrap_or(""),
                        "status": f["status"]["name"].as_str().unwrap_or(""),
                        "assignee": f["assignee"]["displayName"].as_str().unwrap_or("Unassigned"),
                        "priority": f["priority"]["name"].as_str().unwrap_or(""),
                        "type": f["issuetype"]["name"].as_str().unwrap_or(""),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    serde_json::to_string(&serde_json::json!({ "total": total, "returned": issues.len(), "issues": issues }))
        .map_err(|e| e.to_string())
}

/// Get full details of a single Jira issue including recent comments.
#[tauri::command]
async fn jira_get_issue(
    base_url: String,
    email: String,
    api_token: String,
    issue_key: String,
) -> Result<String, String> {
    let api_base = jira_api_base(&base_url);
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/rest/api/2/issue/{}", api_base, issue_key))
        .header("Authorization", jira_auth_header(&email, &api_token))
        .header("Accept", "application/json")
        .query(&[("fields", "summary,status,assignee,priority,issuetype,description,comment")])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Jira API error: {}", e))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let f = &json["fields"];
    let comments: Vec<serde_json::Value> = f["comment"]["comments"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .rev()
                .take(5)
                .map(|c| serde_json::json!({
                    "author": c["author"]["displayName"].as_str().unwrap_or(""),
                    "body": c["body"].as_str().unwrap_or(""),
                    "created": c["created"].as_str().unwrap_or(""),
                }))
                .collect()
        })
        .unwrap_or_default();

    serde_json::to_string(&serde_json::json!({
        "key": json["key"].as_str().unwrap_or(""),
        "summary": f["summary"].as_str().unwrap_or(""),
        "status": f["status"]["name"].as_str().unwrap_or(""),
        "assignee": f["assignee"]["displayName"].as_str().unwrap_or("Unassigned"),
        "priority": f["priority"]["name"].as_str().unwrap_or(""),
        "type": f["issuetype"]["name"].as_str().unwrap_or(""),
        "description": f["description"].as_str().unwrap_or(""),
        "recent_comments": comments,
    }))
    .map_err(|e| e.to_string())
}

/// Create a new Jira issue.
#[tauri::command]
async fn jira_create_issue(
    base_url: String,
    email: String,
    api_token: String,
    project_key: String,
    issue_type: String,
    summary: String,
    description: Option<String>,
) -> Result<String, String> {
    let api_base = jira_api_base(&base_url);
    let client = reqwest::Client::new();

    let mut fields = serde_json::json!({
        "project": { "key": project_key },
        "issuetype": { "name": issue_type },
        "summary": summary,
    });
    if let Some(desc) = description {
        fields["description"] = serde_json::Value::String(desc);
    }

    let resp = client
        .post(format!("{}/rest/api/2/issue", api_base))
        .header("Authorization", jira_auth_header(&email, &api_token))
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&serde_json::json!({ "fields": fields }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Jira API error: {}", e))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    serde_json::to_string(&serde_json::json!({
        "key": json["key"].as_str().unwrap_or(""),
        "created": true,
    }))
    .map_err(|e| e.to_string())
}

/// Add a comment to an existing Jira issue.
#[tauri::command]
async fn jira_add_comment(
    base_url: String,
    email: String,
    api_token: String,
    issue_key: String,
    comment: String,
) -> Result<String, String> {
    let api_base = jira_api_base(&base_url);
    let client = reqwest::Client::new();
    client
        .post(format!("{}/rest/api/2/issue/{}/comment", api_base, issue_key))
        .header("Authorization", jira_auth_header(&email, &api_token))
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&serde_json::json!({ "body": comment }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Jira API error: {}", e))?;

    Ok(format!("Comment added to {}", issue_key))
}

// ── Existing commands ────────────────────────────────────────────────────────

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Walk NSSpeechSynthesizer.availableVoices and return the identifier for the
/// given friendly name (case-insensitive). Returns None if not found.
#[cfg(target_os = "macos")]
unsafe fn find_voice_id(name: &str) -> Option<String> {
    use objc::{class, msg_send, sel, sel_impl};
    let synth_class = class!(NSSpeechSynthesizer);
    let voices: *mut objc::runtime::Object = msg_send![synth_class, availableVoices];
    let count: usize = msg_send![voices, count];
    for i in 0..count {
        let vid: *mut objc::runtime::Object = msg_send![voices, objectAtIndex: i];
        let attrs: *mut objc::runtime::Object = msg_send![synth_class, attributesForVoice: vid];
        let name_key: *mut objc::runtime::Object = {
            let s = std::ffi::CStr::from_ptr(b"VoiceName\0".as_ptr() as _);
            msg_send![class!(NSString), stringWithUTF8String: s.as_ptr()]
        };
        let name_obj: *mut objc::runtime::Object = msg_send![attrs, objectForKey: name_key];
        if name_obj.is_null() { continue; }
        let utf8: *const std::os::raw::c_char = msg_send![name_obj, UTF8String];
        if utf8.is_null() { continue; }
        let vname = std::ffi::CStr::from_ptr(utf8).to_string_lossy();
        if vname.eq_ignore_ascii_case(name) {
            let id_utf8: *const std::os::raw::c_char = msg_send![vid, UTF8String];
            if !id_utf8.is_null() {
                return Some(std::ffi::CStr::from_ptr(id_utf8).to_string_lossy().into_owned());
            }
        }
    }
    None
}

/// Speak text using NSSpeechSynthesizer (in-process, all voices including Premium).
/// Awaits completion so the JS caller can track isSpeaking state accurately.
#[tauri::command]
async fn speak_text(text: String, voice: String) {
    STOP_SPEAKING.store(false, Ordering::SeqCst);

    #[cfg(target_os = "macos")]
    tokio::task::spawn_blocking(move || unsafe {
        use objc::{class, msg_send, sel, sel_impl};

        let pool: *mut objc::runtime::Object = msg_send![class!(NSAutoreleasePool), new];

        let synth_class = class!(NSSpeechSynthesizer);

        let synth: *mut objc::runtime::Object = if !voice.is_empty() {
            if let Some(vid_str) = find_voice_id(&voice) {
                let c_vid = std::ffi::CString::new(vid_str).unwrap_or_default();
                let ns_vid: *mut objc::runtime::Object =
                    msg_send![class!(NSString), stringWithUTF8String: c_vid.as_ptr()];
                let s: *mut objc::runtime::Object = msg_send![synth_class, alloc];
                msg_send![s, initWithVoice: ns_vid]
            } else {
                msg_send![synth_class, new]
            }
        } else {
            msg_send![synth_class, new]
        };

        if synth.is_null() {
            let _: () = msg_send![pool, release];
            return;
        }

        let clean = text.replace('\0', "");
        let c_text = std::ffi::CString::new(clean).unwrap_or_default();
        let ns_text: *mut objc::runtime::Object =
            msg_send![class!(NSString), stringWithUTF8String: c_text.as_ptr()];

        let started: bool = msg_send![synth, startSpeakingString: ns_text];
        if !started {
            let _: () = msg_send![synth, release];
            let _: () = msg_send![pool, release];
            return;
        }

        // Drive the thread's RunLoop so NSSpeechSynthesizer can deliver audio callbacks.
        let run_loop: *mut objc::runtime::Object = msg_send![class!(NSRunLoop), currentRunLoop];
        loop {
            let date: *mut objc::runtime::Object =
                msg_send![class!(NSDate), dateWithTimeIntervalSinceNow: 0.05f64];
            let _: () = msg_send![run_loop, runUntilDate: date];

            if STOP_SPEAKING.load(Ordering::Relaxed) {
                let _: () = msg_send![synth, stopSpeaking];
                break;
            }
            let is_speaking: bool = msg_send![synth, isSpeaking];
            if !is_speaking { break; }
        }

        let _: () = msg_send![synth, release];
        let _: () = msg_send![pool, release];
    })
    .await
    .ok();

    #[cfg(not(target_os = "macos"))]
    let _ = (text, voice);
}

/// Signal the speak_text loop to stop at its next poll tick.
#[tauri::command]
fn stop_speaking_native() {
    STOP_SPEAKING.store(true, Ordering::SeqCst);
}

/// Copy a file from src to dest, creating parent directories as needed.
#[tauri::command]
fn copy_file(src: String, dest: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&dest).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&src, &dest).map(|_| ()).map_err(|e| e.to_string())
}

/// Read a binary file and return its contents as a base64-encoded string.
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

/// Read a text file (bypasses Tauri fs scope — needed for Google Drive paths).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write a text file, creating parent directories as needed.
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())
}

/// Delete a single file.
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

/// List all files (not subdirectories) in a directory. Returns empty vec if dir doesn't exist.
#[tauri::command]
fn list_dir(path: String) -> Result<Vec<String>, String> {
    let dir = std::path::Path::new(&path);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut files: Vec<String> = entries
        .flatten()
        .filter_map(|e| {
            let p = e.path();
            if p.is_file() { p.to_str().map(|s| s.to_owned()) } else { None }
        })
        .collect();
    files.sort();
    Ok(files)
}

/// Returns all installed English voices via NSSpeechSynthesizer.
/// Unlike speechSynthesis.getVoices() in WKWebView, this includes Premium voices.
#[tauri::command]
fn list_system_voices() -> Vec<String> {
    #[cfg(target_os = "macos")]
    unsafe {
        use objc::{class, msg_send, sel, sel_impl};
        let synth_class = class!(NSSpeechSynthesizer);
        let voices: *mut objc::runtime::Object = msg_send![synth_class, availableVoices];
        let count: usize = msg_send![voices, count];
        let mut names = Vec::new();
        for i in 0..count {
            let voice_id: *mut objc::runtime::Object = msg_send![voices, objectAtIndex: i];
            let attrs: *mut objc::runtime::Object =
                msg_send![synth_class, attributesForVoice: voice_id];
            let name_key: *mut objc::runtime::Object = {
                let s = std::ffi::CStr::from_ptr(b"VoiceName\0".as_ptr() as _);
                msg_send![class!(NSString), stringWithUTF8String: s.as_ptr()]
            };
            let name_obj: *mut objc::runtime::Object = msg_send![attrs, objectForKey: name_key];
            if name_obj.is_null() { continue; }
            let utf8: *const std::os::raw::c_char = msg_send![name_obj, UTF8String];
            if utf8.is_null() { continue; }
            let name = std::ffi::CStr::from_ptr(utf8).to_string_lossy().into_owned();
            let locale_key: *mut objc::runtime::Object = {
                let s = std::ffi::CStr::from_ptr(b"VoiceLocaleIdentifier\0".as_ptr() as _);
                msg_send![class!(NSString), stringWithUTF8String: s.as_ptr()]
            };
            let locale_obj: *mut objc::runtime::Object =
                msg_send![attrs, objectForKey: locale_key];
            if !locale_obj.is_null() {
                let locale_utf8: *const std::os::raw::c_char = msg_send![locale_obj, UTF8String];
                if !locale_utf8.is_null() {
                    let locale = std::ffi::CStr::from_ptr(locale_utf8).to_string_lossy();
                    if locale.starts_with("en") {
                        names.push(name);
                    }
                }
            }
        }
        names
    }
    #[cfg(not(target_os = "macos"))]
    vec![]
}

/// Installs a WKUIDelegate on the given window's WKWebView that auto-grants
/// media capture permission (microphone). Without this, webkitSpeechRecognition
/// always fails with "service-not-allowed" in a WKWebView-based app.
#[cfg(target_os = "macos")]
fn install_media_permission_delegate(win: &tauri::WebviewWindow) {
    use objc::{class, declare::ClassDecl, msg_send, sel, sel_impl, runtime::{Object, Sel}};
    use std::sync::Once;

    static INIT: Once = Once::new();
    INIT.call_once(|| unsafe {
        let mut decl = ClassDecl::new("OberonMediaDelegate", class!(NSObject)).unwrap();

        extern "C" fn handle_media_permission(
            _this: &Object,
            _cmd: Sel,
            _webview: *mut Object,
            _origin: *mut Object,
            _frame: *mut Object,
            _kind: usize,
            handler: *mut c_void,
        ) {
            // WKPermissionDecisionGrant = 1
            unsafe { call_block_usize(handler, 1); }
        }

        decl.add_method(
            sel!(webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:),
            handle_media_permission as extern "C" fn(
                &Object, Sel,
                *mut Object, *mut Object, *mut Object,
                usize,
                *mut c_void,
            ),
        );

        decl.register();
    });

    let _ = win.with_webview(|wv| unsafe {
        let cls = class!(OberonMediaDelegate);
        let delegate: *mut Object = msg_send![cls, new];
        let webview = wv.inner() as *mut Object;
        let _: () = msg_send![webview, setUIDelegate: delegate];
        // WKWebView retains the delegate; release our ref so RC stays at 1
        let _: () = msg_send![delegate, release];
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_deep_link::DeepLinkExt;

    tauri::Builder::default()
        .manage(Mutex::new(AtlassianOAuthState::default()))
        .register_uri_scheme_protocol("vault", |_app, request| {
            let uri = request.uri().to_string();
            // vault://localhost/absolute/path/to/file  (path segments are percent-encoded)
            let path_encoded = uri
                .trim_start_matches("vault://localhost")
                .trim_start_matches("vault://");

            let path = urlencoding::decode(path_encoded)
                .map(|c| c.into_owned())
                .unwrap_or_else(|_| path_encoded.to_string());

            let ext = std::path::Path::new(&path)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");

            let content_type = match ext.to_lowercase().as_str() {
                "pdf"        => "application/pdf",
                "png"        => "image/png",
                "jpg"|"jpeg" => "image/jpeg",
                "gif"        => "image/gif",
                "webp"       => "image/webp",
                _            => "application/octet-stream",
            };

            match std::fs::read(&path) {
                Ok(bytes) => tauri::http::Response::builder()
                    .status(200)
                    .header("Content-Type", content_type)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(bytes)
                    .unwrap(),
                Err(e) => tauri::http::Response::builder()
                    .status(404)
                    .body(e.to_string().into_bytes())
                    .unwrap(),
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(win) = app.get_webview_window("capture") {
                            let visible = win.is_visible().unwrap_or(false);
                            if visible {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = win.emit("capture-opened", ());
                            }
                        }
                    }
                })
                .build(),
        )
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            app.global_shortcut().register("CmdOrCtrl+Shift+K")?;

            // Route thepattern:// deep links to the frontend
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let _ = handle.emit("atlassian-deep-link", url.to_string());
                }
            });

            #[cfg(target_os = "macos")]
            if let Some(main_win) = app.get_webview_window("main") {
                install_media_permission_delegate(&main_win);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            list_system_voices,
            speak_text,
            stop_speaking_native,
            copy_file,
            read_file_base64,
            read_text_file,
            write_text_file,
            delete_file,
            list_dir,
            atlassian_start_oauth,
            atlassian_exchange_code,
            atlassian_refresh_token,
            jira_search,
            jira_get_issue,
            jira_create_issue,
            jira_add_comment,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    if let Some(win) = app_handle.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            }
        });
}
