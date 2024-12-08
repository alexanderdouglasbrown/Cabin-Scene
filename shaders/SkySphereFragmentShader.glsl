#version 300 es
precision highp float;

in vec2 v_textureCoord;

uniform sampler2D u_diffuseMap;

out vec4 outColor;

void main() {
    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord);

    outColor = vec4(diffuseMapColor.rgb, diffuseMapColor.a);
}