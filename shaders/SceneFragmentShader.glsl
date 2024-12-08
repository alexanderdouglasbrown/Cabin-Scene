#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_textureCoord;
in vec4 v_projectedTextureCoord;

in vec3 v_worldPosition;

uniform vec3 u_lightDirection; // normalized
uniform float u_lightIntensity;

uniform float u_isReflection;
uniform float u_reflectionHeight;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_projectedTexture;

uniform vec3 u_diffuse;
uniform float u_opacity;

out vec4 outColor;

void main() {
    if (u_isReflection > 0.5 && v_worldPosition.y < u_reflectionHeight)
        discard;

    float light = max(dot(v_normal, u_lightDirection) * 0.5 + 0.75, 0.0);

    vec3 projectedTextureCoord = v_projectedTextureCoord.xyz / v_projectedTextureCoord.w;
    float currentDepth = projectedTextureCoord.z - 0.0001;

    float projectedDepth = texture(u_projectedTexture, projectedTextureCoord.xy).r;
    float shadow = (projectedTextureCoord.z >= 0.0 && projectedTextureCoord.z <= 1.0 && projectedDepth <= currentDepth) ? 0.5 : 1.0;

    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord);

    vec3 finalDiffuse = u_diffuse * diffuseMapColor.rgb;
    float finalOpacity = u_opacity * diffuseMapColor.a;

    outColor = vec4(
        finalDiffuse * light * shadow * u_lightIntensity,
        finalOpacity
    );
}