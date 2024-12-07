#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_textureCoord;

uniform mat4 u_world;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_textureMatrix;

uniform float u_isReflection;
uniform float u_reflectionHeight;

out vec3 v_normal;
out vec2 v_textureCoord;
out vec4 v_projectedTextureCoord;
out float v_isReflection;
out float v_clipDistance;

void main() {
    gl_Position = u_projection * u_view * u_world * a_position;

    v_normal = normalize(a_normal);
    v_textureCoord = a_textureCoord;
    v_projectedTextureCoord = u_textureMatrix * u_world * a_position;

    v_isReflection = u_isReflection;
    vec4 worldPos = u_world * a_position;
    v_clipDistance = dot(worldPos.xyz, vec3(0.0, 1.0, 0.0)) - u_reflectionHeight;
}