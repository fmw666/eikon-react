// Library entrypoint for the Tauri 2 desktop shell. `main.rs` is a thin
// binary wrapper that calls into this crate so Tauri's mobile target
// (which builds the same crate as a `cdylib`) can also use `run()`.
//
// Add custom commands by chaining `.invoke_handler(tauri::generate_handler![…])`
// onto the builder; they're then callable from the React frontend via
// `@tauri-apps/api`'s `invoke('cmd_name', { /* args */ })`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
