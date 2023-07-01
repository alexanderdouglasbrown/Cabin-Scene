#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_textureCoord;

uniform mat4 u_model;
uniform mat4 u_world;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_textureMatrix;

out vec3 v_normal;
out vec2 v_textureCoord;
out vec4 v_projectedTextureCoord;

void main() {
    gl_Position = u_projection * u_view * u_world * u_model * a_position;

    v_normal = normalize(a_normal);
    v_textureCoord = a_textureCoord;
    v_projectedTextureCoord = u_textureMatrix * u_world * u_model * a_position;
}