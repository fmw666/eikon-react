// Prevents an extra console window on Windows in release; this attribute is
// otherwise a no-op. Kept gated behind `not(debug_assertions)` so `cargo run`
// in dev still attaches a console for `eprintln!` / panic output.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run()
}
