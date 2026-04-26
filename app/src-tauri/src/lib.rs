#![allow(unexpected_cfgs)]

use std::sync::atomic::{AtomicBool, Ordering};
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
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
        .setup(|app| {
            app.global_shortcut().register("CmdOrCtrl+Shift+K")?;

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
            stop_speaking_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
