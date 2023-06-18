// Ported from JS from functions found throughout https://webgl2fundamentals.org/webgl/lessons/webgl-2d-matrices.html -- Thanks!

use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

#[wasm_bindgen]
pub fn degrees_to_radians(degrees: f32) -> f32 {
    use std::f32::consts::PI;

    degrees * PI / 180.0f32
}

#[wasm_bindgen]
pub fn cross(a: Float32Array, b: Float32Array) -> Float32Array {
    let arr = [
        a.get_index(1) * b.get_index(2) - a.get_index(2) * b.get_index(1),
        a.get_index(2) * b.get_index(0) - a.get_index(0) * b.get_index(2),
        a.get_index(0) * b.get_index(1) - a.get_index(1) * b.get_index(0)
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn normalize(v: Float32Array) -> Float32Array {

    let length = (v.get_index(0) * v.get_index(0) + v.get_index(1) * v.get_index(1) + v.get_index(2) * v.get_index(2)).sqrt();

    if length > 0.0 {
        let arr = [v.get_index(0) / length, v.get_index(1) / length, v.get_index(2) / length];
        return Float32Array::from(&arr[..]);
    } else {
        let arr = [0.0, 0.0, 0.0];
        return Float32Array::from(&arr[..]);
    }
}

#[wasm_bindgen]
pub fn subtract_vectors(a: Float32Array, b: Float32Array) -> Float32Array {
    let arr = [a.get_index(0) - b.get_index(0), a.get_index(1) - b.get_index(1), a.get_index(2) - b.get_index(2)];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_identity() -> Float32Array {
    let arr = [
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_perspective(fov: f32, aspect: f32, near: f32, far: f32) -> Float32Array {
    use std::f32::consts::PI;

    let f = (PI * 0.5 - 0.5 * fov).tan();
    let range_inv = 1.0 / (near - far);

    let arr = [
        (f / aspect), 0.0, 0.0, 0.0,
        0.0, f, 0.0, 0.0,
        0.0, 0.0, ((near + far) * range_inv), -1.0,
        0.0, 0.0, (near * far * range_inv * 2.0), 0.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_look_at(camera_pos: Float32Array, camera_target: Float32Array, up: Float32Array) -> Float32Array {
    let z_axis = normalize(subtract_vectors(Float32Array::clone(&camera_pos), camera_target));
    let x_axis = normalize(cross(up, Float32Array::clone(&z_axis)));
    let y_axis = normalize(cross(Float32Array::clone(&z_axis), Float32Array::clone(&x_axis)));

    let arr = [
        x_axis.get_index(0), x_axis.get_index(1), x_axis.get_index(2), 0.0,
        y_axis.get_index(0), y_axis.get_index(1), y_axis.get_index(2), 0.0,
        z_axis.get_index(0), z_axis.get_index(1), z_axis.get_index(2), 0.0,
        camera_pos.get_index(0), camera_pos.get_index(1), camera_pos.get_index(2), 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_inverse(m: Float32Array) -> Float32Array{
    let m00 = m.get_index(0 * 4 + 0);
    let m01 = m.get_index(0 * 4 + 1);
    let m02 = m.get_index(0 * 4 + 2);
    let m03 = m.get_index(0 * 4 + 3);
    let m10 = m.get_index(1 * 4 + 0);
    let m11 = m.get_index(1 * 4 + 1);
    let m12 = m.get_index(1 * 4 + 2);
    let m13 = m.get_index(1 * 4 + 3);
    let m20 = m.get_index(2 * 4 + 0);
    let m21 = m.get_index(2 * 4 + 1);
    let m22 = m.get_index(2 * 4 + 2);
    let m23 = m.get_index(2 * 4 + 3);
    let m30 = m.get_index(3 * 4 + 0);
    let m31 = m.get_index(3 * 4 + 1);
    let m32 = m.get_index(3 * 4 + 2);
    let m33 = m.get_index(3 * 4 + 3);
    let tmp_0 = m22 * m33;
    let tmp_1 = m32 * m23;
    let tmp_2 = m12 * m33;
    let tmp_3 = m32 * m13;
    let tmp_4 = m12 * m23;
    let tmp_5 = m22 * m13;
    let tmp_6 = m02 * m33;
    let tmp_7 = m32 * m03;
    let tmp_8 = m02 * m23;
    let tmp_9 = m22 * m03;
    let tmp_10 = m02 * m13;
    let tmp_11 = m12 * m03;
    let tmp_12 = m20 * m31;
    let tmp_13 = m30 * m21;
    let tmp_14 = m10 * m31;
    let tmp_15 = m30 * m11;
    let tmp_16 = m10 * m21;
    let tmp_17 = m20 * m11;
    let tmp_18 = m00 * m31;
    let tmp_19 = m30 * m01;
    let tmp_20 = m00 * m21;
    let tmp_21 = m20 * m01;
    let tmp_22 = m00 * m11;
    let tmp_23 = m10 * m01;

    let t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) - (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    let t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) - (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    let t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) - (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    let t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) - (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);
    
    let d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    let arr = [
        d * t0,
        d * t1,
        d * t2,
        d * t3,
        d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) - (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
        d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) - (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
        d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) - (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
        d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) - (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
        d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) - (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
        d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) - (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
        d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) - (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
        d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) - (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
        d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) - (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
        d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) - (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
        d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) - (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
        d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) - (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];

    Float32Array::from(&arr[..])
}

// #[wasm_bindgen]
// pub fn yRotation(angle){}

/*
[
    (f / aspect), 0.0, 0.0, 0.0,
    0.0, f, 0.0, 0.0,
    0.0, 0.0, ((near + far) * rangeInv), -1.0,
    0.0, 0.0, (near * far * rangeInv * 2.0), 0.0
]
        */