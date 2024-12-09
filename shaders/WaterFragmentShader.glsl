#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_textureCoord;
in vec4 v_projectedTextureCoord;

uniform vec3 u_lightDirection; // normalized
uniform float u_lightIntensity;

uniform sampler2D u_reflectionDiffuseMap;
uniform sampler2D u_diffuseMap;
uniform sampler2D u_shadowDiffuseMap;

uniform float u_opacity;

out vec4 outColor;

void main() {
    float light = max(dot(v_normal, u_lightDirection) * 0.5 + 0.75, 0.0);

    vec3 projectedTextureCoord = v_projectedTextureCoord.xyz / v_projectedTextureCoord.w;
    float currentDepth = projectedTextureCoord.z - 0.0001;

    float projectedDepth = texture(u_shadowDiffuseMap, projectedTextureCoord.xy).r;
    float shadow = (projectedTextureCoord.z >= 0.0 && projectedTextureCoord.z <= 1.0 && projectedDepth <= currentDepth) ? 0.5 : 1.0;

    vec4 reflectionDiffuseMapColor = texture(u_reflectionDiffuseMap, projectedTextureCoord.xy);
    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord) * shadow * light * u_lightIntensity;

    vec3 finalDiffuse = mix(reflectionDiffuseMapColor * 0.8, diffuseMapColor, 0.25).rgb;
    float finalOpacity = u_opacity;

    outColor = vec4(
        finalDiffuse,
        finalOpacity
    );
}