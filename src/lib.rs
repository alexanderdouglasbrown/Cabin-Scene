// Ported from JS from functions found throughout https://webgl2fundamentals.org/webgl/lessons/webgl-2d-matrices.html -- Thanks!

use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

#[wasm_bindgen]
pub fn degrees_to_radians(degrees: f32) -> f32 {
    use std::f32::consts::PI;

    degrees * PI / 180.0
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
pub fn m4_multiply(a: Float32Array, b: Float32Array) -> Float32Array {
    let b00 = b.get_index(0);
    let b01 = b.get_index(1);
    let b02 = b.get_index(2);
    let b03 = b.get_index(3);
    let b10 = b.get_index(4);
    let b11 = b.get_index(5);
    let b12 = b.get_index(6);
    let b13 = b.get_index(7);
    let b20 = b.get_index(8);
    let b21 = b.get_index(9);
    let b22 = b.get_index(10);
    let b23 = b.get_index(11);
    let b30 = b.get_index(12);
    let b31 = b.get_index(13);
    let b32 = b.get_index(14);
    let b33 = b.get_index(15);
    let a00 = a.get_index(0);
    let a01 = a.get_index(1);
    let a02 = a.get_index(2);
    let a03 = a.get_index(3);
    let a10 = a.get_index(4);
    let a11 = a.get_index(5);
    let a12 = a.get_index(6);
    let a13 = a.get_index(7);
    let a20 = a.get_index(8);
    let a21 = a.get_index(9);
    let a22 = a.get_index(10);
    let a23 = a.get_index(11);
    let a30 = a.get_index(12);
    let a31 = a.get_index(13);
    let a32 = a.get_index(14);
    let a33 = a.get_index(15);

    let arr = [
        b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
        b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
        b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
        b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
        b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
        b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
        b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
        b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
        b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
        b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
        b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
        b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
        b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
        b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
        b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
        b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];

    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_inverse(m: Float32Array) -> Float32Array{
    let m00 = m.get_index(0);
    let m01 = m.get_index(1);
    let m02 = m.get_index(2);
    let m03 = m.get_index(3);
    let m10 = m.get_index(4);
    let m11 = m.get_index(5);
    let m12 = m.get_index(6);
    let m13 = m.get_index(7);
    let m20 = m.get_index(8);
    let m21 = m.get_index(9);
    let m22 = m.get_index(10);
    let m23 = m.get_index(11);
    let m30 = m.get_index(12);
    let m31 = m.get_index(13);
    let m32 = m.get_index(14);
    let m33 = m.get_index(15);
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

#[wasm_bindgen]
pub fn m4_translation(tx: f32, ty: f32, tz: f32) -> Float32Array {
    let arr = [
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        tx, ty, tz, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_scaling(sx: f32, sy: f32, sz: f32) -> Float32Array {
    let arr = [
        sx, 0.0, 0.0, 0.0,
        0.0, sy, 0.0, 0.0,
        0.0, 0.0, sz, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_x_rotation(angle: f32) -> Float32Array {
    let c = angle.cos();
    let s = angle.sin();

    let arr = [
        1.0, 0.0, 0.0, 0.0,
        0.0, c, s, 0.0,
        0.0, -s, c, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_y_rotation(angle: f32) -> Float32Array {
    let c = angle.cos();
    let s = angle.sin();

    let arr = [
        c, 0.0, -s, 0.0,
        0.0, 1.0, 0.0, 0.0,
        s, 0.0, c, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_z_rotation(angle: f32) -> Float32Array {
    let c = angle.cos();
    let s = angle.sin();

    let arr = [
        c, s, 0.0, 0.0,
        -s, c, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_projection(width: f32, height: f32, depth: f32) -> Float32Array {
    let arr = [
        (2.0 / width), 0.0, 0.0, 0.0,
        0.0, (-2.0 / height), 0.0, 0.0,
        0.0, 0.0, (2.0 / depth), 0.0,
        -1.0, 1.0, 0.0, 1.0
    ];
    Float32Array::from(&arr[..])
}

#[wasm_bindgen]
pub fn m4_transpose(m: Float32Array) -> Float32Array {
    let arr = [
        m.get_index(0), m.get_index(4), m.get_index(8), m.get_index(12),
        m.get_index(1), m.get_index(5), m.get_index(9), m.get_index(13),
        m.get_index(2), m.get_index(6), m.get_index(10), m.get_index(14),
        m.get_index(3), m.get_index(7), m.get_index(11), m.get_index(15),
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