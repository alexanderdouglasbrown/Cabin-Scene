import { degrees_to_radians, m4_perspective, m4_look_at, m4_inverse, m4_y_rotation, m4_z_rotation, m4_identity, m4_translation, m4_scaling, m4_multiply, m4_x_rotation, normalize } from './pkg'

import objLoader from './src/objLoader'
import { createShader, createProgram } from './src/shaderFunctions'

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
    v_projectedTextureCoord = u_textureMatrix * u_world * a_position;
}
`

const fragmentShaderGLSL = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_textureCoord;
in vec4 v_projectedTextureCoord;

uniform vec3 u_lightDirection; // normalized

uniform sampler2D u_diffuseMap;
uniform sampler2D u_projectedTexture;

uniform vec3 u_diffuse;
uniform float u_opacity;

out vec4 outColor;

void main() {
    float light = max(dot(v_normal, u_lightDirection) * 0.5 + 0.75, 0.0);

    vec3 projectedTextureCoord = v_projectedTextureCoord.xyz / v_projectedTextureCoord.w;
    float currentDepth = projectedTextureCoord.z - 0.001;

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
        finalDiffuse * light * shadow,
        finalOpacity
    );
}
`

const shadowVertexShaderGLSL = `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
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
    let isMouseDown = false
    let cameraDistance = 25 // Guess I need to do this here
    gl.canvas.addEventListener('mousedown', e => {
        isMouseDown = true
    })
    gl.canvas.addEventListener('mouseup', e => {
        isMouseDown = false
        mouseX = null
        mouseY = null
    })
    gl.canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect()
        mouseX = ((e.clientX - rect.left) / gl.canvas.clientWidth)
        mouseY = ((e.clientY - rect.top) / gl.canvas.clientHeight)
    })
    gl.canvas.addEventListener('touchstart', e => {
        isMouseDown = true
    })
    gl.canvas.addEventListener('touchend', e => {
        isMouseDown = false
        mouseX = null
        mouseY = null
    })
    gl.canvas.addEventListener('touchmove', e => {
        e.preventDefault()

        const rect = canvas.getBoundingClientRect()
        mouseX = ((e.touches[0].clientX - rect.left) / gl.canvas.clientWidth)
        mouseY = ((e.touches[0].clientY - rect.top) / gl.canvas.clientHeight)
    })
    gl.canvas.addEventListener('wheel', e => {
        cameraDistance += e.deltaY * 0.01
        if (cameraDistance > 50)
            cameraDistance = 50
        if (cameraDistance < 5)
            cameraDistance = 5
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
    const uDiffuseLoc = gl.getUniformLocation(program, "u_diffuse")
    // const uAmbientLoc = gl.getUniformLocation(program, "u_ambient")
    // const uEmissiveLoc = gl.getUniformLocation(program, "u_emissive")
    const uOpacityLoc = gl.getUniformLocation(program, "u_opacity")

    // Shadow shader
    const shadowVertexShader = createShader(gl, gl.VERTEX_SHADER, shadowVertexShaderGLSL)
    const shadowFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shadowFragmentShaderGLSL)
    const shadowProgram = createProgram(gl, shadowVertexShader, shadowFragmentShader)

    const aShadowPositionLoc = gl.getAttribLocation(shadowProgram, "a_position")
    const uShadowWorldLoc = gl.getUniformLocation(shadowProgram, "u_world")
    const uShadowViewLoc = gl.getUniformLocation(shadowProgram, "u_view")
    const uShadownProjectionLoc = gl.getUniformLocation(shadowProgram, "u_projection")
    const uShadowColorLoc = gl.getUniformLocation(shadowProgram, "u_color")

    const newMeshDataArray = (parsedObjs) => {
        const newMeshData = () => ({
            objName: undefined,
            vao: undefined,
            faces: 0,
            material: undefined,
            shadowPosBuffer: undefined,
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

                data.posBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW)

                data.normalBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer)
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW)

                data.textureCoordBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, data.textureCoordBuffer)
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.textureCoords), gl.STATIC_DRAW)

                // Shadow junk. Do better.
                data.shadowVAO = gl.createVertexArray()
                gl.bindVertexArray(data.shadowVAO)

                gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                gl.vertexAttribPointer(aShadowPositionLoc, 3, gl.FLOAT, false, 0, 0)
                gl.enableVertexAttribArray(aShadowPositionLoc)

                gl.bindVertexArray(null)
                //

                data.vao = gl.createVertexArray()
                gl.bindVertexArray(data.vao)

                gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0)
                gl.enableVertexAttribArray(aPositionLoc)

                gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer)
                gl.vertexAttribPointer(aNormalLoc, 3, gl.FLOAT, false, 0, 0)
                gl.enableVertexAttribArray(aNormalLoc)

                gl.bindBuffer(gl.ARRAY_BUFFER, data.textureCoordBuffer)
                gl.vertexAttribPointer(aTextureCoordLoc, 2, gl.FLOAT, false, 0, 0)
                gl.enableVertexAttribArray(aTextureCoordLoc)

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
    const sceneMeshData = newMeshDataArray(sceneMesh)

    const sunMesh = await objLoader('./models', 'sun')
    const sunMeshData = newMeshDataArray(sunMesh)

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
    // const sunPos = [7, 17, 1]
    const sunScale = 1
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


    let cameraRotationX = 0
    let cameraRotationY = 0
    let lastMouseX = null
    let lastMouseY = null

    const xSlider = document.querySelector("#x-slider")
    const ySlider = document.querySelector("#y-slider")
    const zSlider = document.querySelector("#z-slider")

    console.log(xSlider.value)

    const draw = frameTime => {
        // Handle resize
        if (isInitialSetSize || canvas.clientWidth !== targetCanvasWidth || canvas.clientHeight !== targetCanvasHeight) {
            gl.canvas.width = targetCanvasWidth
            gl.canvas.height = targetCanvasHeight
            aspect = canvas.clientWidth / canvas.clientHeight
            isInitialSetSize = false
        }

        let sunPos = [xSlider.value, ySlider.value, zSlider.value]

        // Mouse
        if (isMouseDown) {
            const xFactor = gl.canvas.clientWidth * 0.2
            const yFactor = gl.canvas.clientHeight * 0.2
            if (lastMouseX != null) {
                cameraRotationX += (mouseY - lastMouseY) * yFactor
                cameraRotationY += (mouseX - lastMouseX) * xFactor

                if (cameraRotationX < -25)
                    cameraRotationX = -25
                if (cameraRotationX > 25)
                    cameraRotationX = 25
            }

            lastMouseX = mouseX
            lastMouseY = mouseY
        } else {
            lastMouseX = null
            lastMouseY = null
        }

        const cameraPosition = [cameraDistance, cameraDistance, cameraDistance]
        const camera = m4_look_at(cameraPosition, cameraTarget, up)
        const view = m4_inverse(camera)

        const projection = m4_perspective(fov, aspect, zNear, zFar)
        const updown = m4_multiply(m4_x_rotation(degrees_to_radians(cameraRotationX)), m4_z_rotation(degrees_to_radians(-cameraRotationX))) // Is this correct?
        const world = m4_multiply(updown, m4_y_rotation(degrees_to_radians(cameraRotationY)))


        // Shadow
        gl.useProgram(shadowProgram)
        const shadowWorld = m4_identity()
        const shadowView = m4_inverse(m4_look_at(sunPos, cameraTarget, up))
        const shadowProjection = m4_perspective(degrees_to_radians(120), 1, zNear, zFar)
        gl.uniformMatrix4fv(uShadowWorldLoc, false, shadowWorld)
        gl.uniformMatrix4fv(uShadowViewLoc, false, shadowView)
        gl.uniformMatrix4fv(uShadownProjectionLoc, false, shadowProjection)
        gl.uniform4fv(uShadowColorLoc, [1, 1, 1, 1])

        // gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        // gl.canvas.width = depthTextureSize
        // gl.canvas.height = depthTextureSize
        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer)
        gl.viewport(0, 0, depthTextureSize, depthTextureSize)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

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
        gl.clearColor(0.6, 0.74, 0.95, 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.uniformMatrix4fv(uWorldLoc, false, world)
        gl.uniformMatrix4fv(uViewLoc, false, view)
        gl.uniformMatrix4fv(uProjectionLoc, false, projection)

        gl.uniform3fv(uLightDirectionLoc, normalize(sunPos))
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
            // gl.uniform3fv(uAmbientLoc, data.material.ambient)
            // gl.uniform3fv(uEmissiveLoc, data.material.emissive)
            // gl.uniform3fv(uSpecularLoc, data.material.specular)
            // gl.uniform1f(uShininessLoc, data.material.shininess)
            gl.uniform1f(uOpacityLoc, data.material.opacity)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, data.texture)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, depthTexture)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        }

        let model = m4_identity()
        gl.uniformMatrix4fv(uModelLoc, false, model)
        sceneMeshData.forEach(drawMesh)

        // Sun
        // Order matters -- scale, rotate, transform
        model = m4_multiply(m4_scaling(sunScale, sunScale, sunScale), model)
        model = m4_multiply(m4_z_rotation(sunRotateZ), model)
        model = m4_multiply(m4_y_rotation(sunRotateY), model)
        model = m4_multiply(m4_x_rotation(sunRotateX), model)
        model = m4_multiply(m4_look_at(sunPos, [0.0, 0.0, 0.0], up), model)
        model = m4_multiply(m4_translation(sunPos[0], sunPos[1], sunPos[2]), model)

        gl.uniformMatrix4fv(uModelLoc, false, model)
        sunMeshData.forEach(drawMesh)

        gl.drawArrays(gl.POINTS, 0, 1)

        requestAnimationFrame(draw)
    }

    draw()
}

main()