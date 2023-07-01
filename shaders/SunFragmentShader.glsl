#version 300 es
precision highp float;

in vec2 v_textureCoord;

uniform float u_lightIntensity;
uniform sampler2D u_diffuseMap;

out vec4 outColor;

void main() {
    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord);

    outColor = vec4(diffuseMapColor.rgb * u_lightIntensity * 1.2, 1.0);
}