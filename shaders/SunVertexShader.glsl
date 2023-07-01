#version 300 es

in vec4 a_position;
in vec2 a_textureCoord;

uniform mat4 u_model;
uniform mat4 u_world;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec2 v_textureCoord;

void main() {
    gl_Position = u_projection * u_view * u_world * u_model * a_position;

    v_textureCoord = a_textureCoord;
}