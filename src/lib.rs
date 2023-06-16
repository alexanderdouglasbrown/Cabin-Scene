use wasm_bindgen::prelude::*;
// use web_sys::{WebGl2RenderingContext, WebGlProgram, WebGlShader};

#[wasm_bindgen(start)]
fn start() -> Result<(), JsValue> {
    use web_sys::console;

    console::log_1(&"Hello, wasm".into());

    Ok(())
}