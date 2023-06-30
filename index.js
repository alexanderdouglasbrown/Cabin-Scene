import { degrees_to_radians, m4_perspective, m4_look_at, m4_inverse, m4_y_rotation, m4_z_rotation, m4_identity, m4_translation, m4_scaling, m4_multiply, m4_x_rotation, normalize } from './pkg'

import objLoader from './src/objLoader'
import { createShader, createProgram } from './src/shaderFunctions'
import getSkyColor from './src/getSkyColor'

const vertexShaderGLSL = `#version 300 es
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
`

const fragmentShaderGLSL = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_textureCoord;
in vec4 v_projectedTextureCoord;

uniform vec3 u_lightDirection; // normalized
uniform float u_lightIntensity;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_projectedTexture;

uniform vec3 u_diffuse;
uniform float u_opacity;

out vec4 outColor;

void main() {
    float light = max(dot(v_normal, u_lightDirection) * 0.5 + 0.75, 0.0);

    vec3 projectedTextureCoord = v_projectedTextureCoord.xyz / v_projectedTextureCoord.w;
    float currentDepth = projectedTextureCoord.z - 0.0001;

    bool inRange =
        projectedTextureCoord.x >= 0.0 &&
        projectedTextureCoord.x <= 1.0 &&
        projectedTextureCoord.y >= 0.0 &&
        projectedTextureCoord.y <= 1.0 &&
        projectedTextureCoord.z >= 0.0 &&
        projectedTextureCoord.z <= 1.0;

    float projectedDepth = texture(u_projectedTexture, projectedTextureCoord.xy).r;
    float shadow = (inRange && projectedDepth <= currentDepth) ? 0.5 : 1.0;

    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord);

    vec3 finalDiffuse = u_diffuse * diffuseMapColor.rgb;
    float finalOpacity = u_opacity * diffuseMapColor.a;

    outColor = vec4(
        finalDiffuse * light * shadow * u_lightIntensity,
        finalOpacity
    );
}
`

const shadowVertexShaderGLSL = `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_model;

void main() {
    gl_Position = u_projection * u_view * u_world * u_model * a_position;
}
`

const shadowFragmentShaderGLSL = `#version 300 es
precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
    outColor = u_color;
}
`

const sunVertexShaderGLSL = `#version 300 es
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

void main() {
    gl_Position = u_projection * u_view * u_world * u_model * a_position;

    v_textureCoord = a_textureCoord;
}
`

const sunFragmentShader = `#version 300 es
precision highp float;

in vec2 v_textureCoord;
in vec4 v_projectedTextureCoord;

uniform float u_lightIntensity;

uniform sampler2D u_diffuseMap;

uniform vec3 u_diffuse;

out vec4 outColor;

void main() {
    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord);

    vec3 finalDiffuse = u_diffuse * diffuseMapColor.rgb;

    outColor = vec4(
        finalDiffuse * u_lightIntensity,
        1.0
    );
}
`

const main = async () => {
    const setOverlay = msg => {
        document.querySelector("#overlay").textContent = msg
    }

    const canvas = document.querySelector("#canvas")
    const gl = canvas.getContext("webgl2")

    if (!gl) {
        setOverlay("WebGL2 failed to load")
        return
    }

    // Mouse watching
    let mouseX = null
    let mouseY = null
    let lastMouseX = null
    let lastMouseY = null
    let isMouseDown = false
    let prevTouchDistance = null
    let cameraDistance = 30

    const handleMouseMove = () => {
        // Mouse
        if (isMouseDown) {
            const xFactor = gl.canvas.clientWidth * 0.275
            const yFactor = gl.canvas.clientHeight * 0.275
            if (lastMouseX != null) {
                cameraRotationX += (mouseY - lastMouseY) * yFactor
                cameraRotationY += (mouseX - lastMouseX) * xFactor
            }

            if (cameraRotationX > 90)
                cameraRotationX = 90
            if (cameraRotationX < -90)
                cameraRotationX = -90
            cameraRotationY = cameraRotationY % 360

            lastMouseX = mouseX
            lastMouseY = mouseY
        }
    }

    const handleZoom = zoom => {
        cameraDistance += zoom

        if (cameraDistance > 85)
            cameraDistance = 85
        if (cameraDistance < 20)
            cameraDistance = 20
    }

    gl.canvas.addEventListener('mousedown', e => {
        isMouseDown = true
    })
    gl.canvas.addEventListener('mouseup', e => {
        isMouseDown = false
        mouseX = null
        mouseY = null
        lastMouseX = null
        lastMouseY = null
    })
    gl.canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect()
        mouseX = ((e.clientX - rect.left) / gl.canvas.clientWidth)
        mouseY = ((e.clientY - rect.top) / gl.canvas.clientHeight)

        handleMouseMove()
    })
    gl.canvas.addEventListener('touchstart', e => {
        isMouseDown = true
    })
    gl.canvas.addEventListener('touchend', e => {
        isMouseDown = false
        prevTouchDistance = null
        mouseX = null
        mouseY = null
        lastMouseX = null
        lastMouseY = null
    })
    gl.canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 2) {
            const currentDistance = Math.sqrt(Math.pow(e.touches[1].clientX - e.touches[0].clientX, 2) + Math.pow(e.touches[1].clientY - e.touches[0].clientY, 2))

            if (prevTouchDistance !== null)
                handleZoom((prevTouchDistance - currentDistance) * 0.2)

            prevTouchDistance = currentDistance
        } else {
            const rect = canvas.getBoundingClientRect()
            mouseX = ((e.touches[0].clientX - rect.left) / gl.canvas.clientWidth)
            mouseY = ((e.touches[0].clientY - rect.top) / gl.canvas.clientHeight)

            handleMouseMove()
        }
    })
    gl.canvas.addEventListener('wheel', e => {
        handleZoom(e.deltaY * 0.015)
    })

    // Resize stuff
    let aspect = canvas.clientWidth / canvas.clientHeight
    let targetCanvasWidth = gl.canvas.width
    let targetCanvasHeight = gl.canvas.height
    const onResize = ro => {
        for (const entry of ro) {
            if (entry.devicePixelContentBoxSize) {
                targetCanvasWidth = entry.devicePixelContentBoxSize[0].inlineSize
                targetCanvasHeight = entry.devicePixelContentBoxSize[0].blockSize
            } else if (entry.contentBoxSize) {
                targetCanvasWidth = entry.contentBoxSize[0].inlineSize * window.devicePixelRatio
                targetCanvasHeight = entry.contentBoxSize[0].blockSize * window.devicePixelRatio
            } else {
                targetCanvasWidth = entry.contentRect.width * window.devicePixelRatio
                targetCanvasHeight = entry.contentRect.height * window.devicePixelRatio
            }
        }
    }
    const resizeObserver = new ResizeObserver(onResize) // Listen for canvas size changes
    try {
        resizeObserver.observe(canvas, { box: "device-pixel-content-box" })
    } catch {
        resizeObserver.observe(canvas, { box: "content-box" })
    }

    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    const loadingImagesSet = new Set()

    // Scene shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderGLSL)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderGLSL)
    const program = createProgram(gl, vertexShader, fragmentShader)

    const aPositionLoc = gl.getAttribLocation(program, "a_position")
    const aNormalLoc = gl.getAttribLocation(program, "a_normal")
    const aTextureCoordLoc = gl.getAttribLocation(program, "a_textureCoord")

    const uModelLoc = gl.getUniformLocation(program, "u_model")
    const uWorldLoc = gl.getUniformLocation(program, "u_world")
    const uViewLoc = gl.getUniformLocation(program, "u_view")
    const uProjectionLoc = gl.getUniformLocation(program, "u_projection")
    const uTextureMatrixLoc = gl.getUniformLocation(program, "u_textureMatrix")

    const uDiffuseMapLoc = gl.getUniformLocation(program, "u_diffuseMap")
    const uProjectedTextureLoc = gl.getUniformLocation(program, "u_projectedTexture")
    const uLightDirectionLoc = gl.getUniformLocation(program, "u_lightDirection")
    const uLightIntensityLoc = gl.getUniformLocation(program, "u_lightIntensity")
    const uDiffuseLoc = gl.getUniformLocation(program, "u_diffuse")
    const uOpacityLoc = gl.getUniformLocation(program, "u_opacity")

    // Shadow shader
    const shadowVertexShader = createShader(gl, gl.VERTEX_SHADER, shadowVertexShaderGLSL)
    const shadowFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shadowFragmentShaderGLSL)
    const shadowProgram = createProgram(gl, shadowVertexShader, shadowFragmentShader)

    const aShadowPositionLoc = gl.getAttribLocation(shadowProgram, "a_position")
    const uShadowModelLoc = gl.getUniformLocation(shadowProgram, "u_model")
    const uShadowWorldLoc = gl.getUniformLocation(shadowProgram, "u_world")
    const uShadowViewLoc = gl.getUniformLocation(shadowProgram, "u_view")
    const uShadownProjectionLoc = gl.getUniformLocation(shadowProgram, "u_projection")
    const uShadowColorLoc = gl.getUniformLocation(shadowProgram, "u_color")

    const newMeshDataArray = (parsedObjs, positionLoc, normalLoc, textureCoordLoc, shadowPositionLoc) => {
        const newMeshData = () => ({
            objName: undefined,
            vao: undefined,
            faces: 0,
            material: undefined,
            posBuffer: undefined,
            normalBuffer: undefined,
            textureCoordBuffer: undefined,
            texture: undefined
        })

        const result = []
        parsedObjs.forEach(obj => {
            obj.meshes.forEach(mesh => {
                const data = newMeshData()

                data.objName = obj.objName
                data.faces = mesh.faces
                data.material = mesh.material

                const texture = gl.createTexture()
                data.texture = texture
                gl.bindTexture(gl.TEXTURE_2D, texture)
                // Filler white pixel texture to be replaced if a real texture is needed
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))

                // The use of setOverlay() here causes a race condition if I decide to do something else with that function down the line
                // But as of now it's fine
                if (mesh.material.diffuseMap) {
                    const image = new Image()
                    image.src = `models/${mesh.material.diffuseMap}`
                    loadingImagesSet.add(mesh.material.diffuseMap)
                    setOverlay("Loading textures...")

                    image.onload = e => {
                        gl.bindTexture(gl.TEXTURE_2D, data.texture)
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
                        gl.generateMipmap(gl.TEXTURE_2D)

                        loadingImagesSet.delete(mesh.material.diffuseMap)
                        if (loadingImagesSet.size === 0)
                            setOverlay(null)
                    }
                }

                if (positionLoc !== undefined) {
                    data.posBuffer = gl.createBuffer()
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW)
                }

                if (normalLoc !== undefined) {
                    data.normalBuffer = gl.createBuffer()
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer)
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW)
                }

                if (textureCoordLoc !== undefined) {
                    data.textureCoordBuffer = gl.createBuffer()
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.textureCoordBuffer)
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.textureCoords), gl.STATIC_DRAW)
                }

                if (shadowPositionLoc !== undefined) {
                    data.shadowVAO = gl.createVertexArray()
                    gl.bindVertexArray(data.shadowVAO)

                    gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                    gl.vertexAttribPointer(shadowPositionLoc, 3, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(shadowPositionLoc)

                    gl.bindVertexArray(null)
                }

                data.vao = gl.createVertexArray()
                gl.bindVertexArray(data.vao)

                if (positionLoc !== undefined) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(positionLoc)
                }

                if (normalLoc !== undefined) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer)
                    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(normalLoc)
                }

                if (textureCoordLoc !== undefined) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.textureCoordBuffer)
                    gl.vertexAttribPointer(textureCoordLoc, 2, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(textureCoordLoc)
                }

                gl.bindVertexArray(null)

                // Transparent materials need to be pushed to the end
                if (mesh && mesh.material && mesh.material.opacity === 1.0)
                    result.unshift(data)
                else
                    result.push(data)
            })
        })

        return result
    }

    const sceneMesh = await objLoader('./models', 'scene')
    const sceneMeshData = newMeshDataArray(sceneMesh, aPositionLoc, aNormalLoc, aTextureCoordLoc, aShadowPositionLoc)

    const sunMesh = await objLoader('./models', 'sun')
    const sunMeshData = newMeshDataArray(sunMesh, aPositionLoc, aNormalLoc, aTextureCoordLoc)

    // Shadow stuff
    const depthTexture = gl.createTexture()
    const depthTextureSize = 4096
    gl.bindTexture(gl.TEXTURE_2D, depthTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, depthTextureSize, depthTextureSize, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const depthFramebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0)

    //////
    const lightDistance = 25
    const sunScale = 10
    const sunDistance = 300
    // Blender's exported default rotation was not ideal
    const sunRotateX = degrees_to_radians(180)
    const sunRotateY = degrees_to_radians(90)
    const sunRotateZ = degrees_to_radians(180)

    let isInitialSetSize = true

    const zNear = 0.1
    const zFar = 1000.0
    const fov = degrees_to_radians(75)

    const cameraTarget = [0, 0, 0]
    const up = [0, 1, 0]

    gl.useProgram(program)

    let cameraRotationX = 25
    let cameraRotationY = 200

    const draw = frameTime => {
        // Handle resize
        if (isInitialSetSize || canvas.clientWidth !== targetCanvasWidth || canvas.clientHeight !== targetCanvasHeight) {
            gl.canvas.width = targetCanvasWidth
            gl.canvas.height = targetCanvasHeight
            aspect = canvas.clientWidth / canvas.clientHeight
            isInitialSetSize = false
        }

        let lightAngle = (-10 + (frameTime || 1) * 0.002) % 360
        if (lightAngle < 0)
            lightAngle += 360

        let lightPosMatrix = m4_identity()
        lightPosMatrix = m4_multiply(lightPosMatrix, m4_z_rotation(degrees_to_radians(lightAngle)))
        lightPosMatrix = m4_multiply(lightPosMatrix, m4_y_rotation(degrees_to_radians(5)))
        const lightPos = [lightPosMatrix[0] * lightDistance, lightPosMatrix[1] * lightDistance, lightPosMatrix[2] * lightDistance]

        const cameraPosition = [0, 0, cameraDistance]
        const camera = m4_look_at(cameraPosition, cameraTarget, up)
        const view = m4_inverse(camera)

        const projection = m4_perspective(fov, aspect, zNear, zFar)
        const world = m4_multiply(m4_x_rotation(degrees_to_radians(cameraRotationX)), m4_y_rotation((degrees_to_radians(cameraRotationY))))

        const landSpin = (frameTime || 1) * 0.000025
        const landModel = m4_y_rotation(landSpin)

        // Sky color
        const skyColor = getSkyColor(lightAngle)
        gl.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0)

        // Shadow
        gl.useProgram(shadowProgram)
        const shadowWorld = m4_identity()
        const shadowView = m4_inverse(m4_look_at(lightPos, cameraTarget, up))
        const shadowProjection = m4_perspective(degrees_to_radians(90), 1, zNear, zFar)
        gl.uniformMatrix4fv(uShadowWorldLoc, false, shadowWorld)
        gl.uniformMatrix4fv(uShadowViewLoc, false, shadowView)
        gl.uniformMatrix4fv(uShadownProjectionLoc, false, shadowProjection)
        gl.uniform4fv(uShadowColorLoc, [1, 1, 1, 1])

        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer)
        gl.viewport(0, 0, depthTextureSize, depthTextureSize)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.uniformMatrix4fv(uShadowModelLoc, false, landModel)
        sceneMeshData.forEach(data => {
            if (data.objName !== "Clouds") {
                gl.bindVertexArray(data.shadowVAO)

                gl.drawArrays(gl.TRIANGLES, 0, data.faces)
            }
        })

        //Scene
        gl.useProgram(program)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.uniformMatrix4fv(uWorldLoc, false, world)
        gl.uniformMatrix4fv(uViewLoc, false, view)
        gl.uniformMatrix4fv(uProjectionLoc, false, projection)

        const lightIntensity = Math.min((skyColor[0] + skyColor[1] + skyColor[2]) / 3 + 0.4, 1.0)
        gl.uniform1f(uLightIntensityLoc, lightIntensity)

        const lightVector = normalize(lightPos)
        gl.uniform3fv(uLightDirectionLoc, lightVector)
        gl.uniform1i(uDiffuseMapLoc, 0)
        gl.uniform1i(uProjectedTextureLoc, 1)

        let textureMatrix = m4_identity()
        textureMatrix = m4_multiply(textureMatrix, m4_translation(0.5, 0.5, 0.5))
        textureMatrix = m4_multiply(textureMatrix, m4_scaling(0.5, 0.5, 0.5))

        textureMatrix = m4_multiply(textureMatrix, shadowProjection)
        textureMatrix = m4_multiply(textureMatrix, shadowView)
        textureMatrix = m4_multiply(textureMatrix, m4_inverse(world))

        gl.uniformMatrix4fv(uTextureMatrixLoc, false, textureMatrix)

        const drawMesh = data => {
            gl.bindVertexArray(data.vao)

            gl.uniform3fv(uDiffuseLoc, data.material.diffuse || [1.0, 1.0, 1.0])
            gl.uniform1f(uOpacityLoc, data.material.opacity)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, data.texture)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, depthTexture)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        }

        // Sun
        // Order matters -- scale, rotate, transform (SRT) order, but also you apply it in reverse
        const sunPos = [lightVector[0] * sunDistance, lightVector[1] * sunDistance, lightVector[2] * sunDistance]
        let model = m4_identity()
        model = m4_multiply(model, m4_translation(sunPos[0], sunPos[1], sunPos[2]))
        model = m4_multiply(model, m4_look_at(sunPos, [0.0, 0.0, 0.0], up))
        model = m4_multiply(model, m4_z_rotation(sunRotateZ))
        model = m4_multiply(model, m4_y_rotation(sunRotateY))
        model = m4_multiply(model, m4_x_rotation(sunRotateX))
        model = m4_multiply(model, m4_scaling(sunScale, sunScale, sunScale))

        gl.uniformMatrix4fv(uModelLoc, false, model)
        sunMeshData.forEach(drawMesh)

        model = m4_identity()
        gl.uniformMatrix4fv(uModelLoc, false, model)
        sceneMeshData.forEach(data => {
            if (data.objName !== "Clouds") {
                gl.enable(gl.CULL_FACE)
                gl.uniformMatrix4fv(uModelLoc, false, landModel)
            } else {
                gl.disable(gl.CULL_FACE)
                gl.uniformMatrix4fv(uModelLoc, false, m4_y_rotation(-landSpin * 2))
            }

            drawMesh(data)
        })

        requestAnimationFrame(draw)
    }

    draw()
}

main()