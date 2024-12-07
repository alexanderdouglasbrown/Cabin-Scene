#version 300 es

in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
}