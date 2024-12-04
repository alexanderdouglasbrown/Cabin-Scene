#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_textureCoord;
in vec4 v_projectedTextureCoord;

uniform vec3 u_lightDirection; // normalized
uniform float u_lightIntensity;

uniform sampler2D u_reflectionDiffuseMap;

uniform vec3 u_diffuse;
uniform float u_opacity;

out vec4 outColor;

void main() {
    float light = max(dot(v_normal, u_lightDirection) * 0.5 + 0.75, 0.0);

    vec3 projectedTextureCoord = v_projectedTextureCoord.xyz / v_projectedTextureCoord.w;

    vec4 diffuseMapColor = texture(u_reflectionDiffuseMap, projectedTextureCoord.xy);

    vec3 finalDiffuse = u_diffuse * diffuseMapColor.rgb;
    float finalOpacity = u_opacity * diffuseMapColor.a;

    outColor = vec4(
        finalDiffuse * light * u_lightIntensity,
        finalOpacity
    );
}