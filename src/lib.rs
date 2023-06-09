use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add (num1: i32, num2: i32) -> i32 {
    return num1 + num2;
}