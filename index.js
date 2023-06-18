import {degrees_to_radians, m4_perspective, m4_look_at, m4_inverse, m4_identity} from './pkg'

import objLoader from './src/objLoader'
import { createShader, createProgram } from './src/shaderFunctions'

const vertexShaderGLSL = `#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_textureCoord;

uniform mat4 u_world;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec3 v_normal;
out vec2 v_textureCoord;

void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
}
`

const fragmentShaderGLSL = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_textureCoord;

uniform sampler2D u_diffuseMap;
uniform vec3 u_diffuse;
uniform float u_opacity;

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);
    vec4 diffuseMapColor = texture(u_diffuseMap, v_textureCoord);

    vec3 finalDiffuse = u_diffuse * diffuseMapColor.rgb;
    float finalOpacity = u_opacity * diffuseMapColor.a;

    outColor = vec4(
        finalDiffuse,
        finalOpacity
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
        console.error("WebGL failed to load")
        return
    }

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

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderGLSL)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderGLSL)
    const program = createProgram(gl, vertexShader, fragmentShader)

    gl.useProgram(program)

    const aPositionLoc = gl.getAttribLocation(program, "a_position")
    const aNormalLoc = gl.getAttribLocation(program, "a_normal")
    const aTextureCoordLoc = gl.getAttribLocation(program, "a_textureCoord")

    const uWorldLoc = gl.getUniformLocation(program, "u_world")
    const uViewLoc = gl.getUniformLocation(program, "u_view")
    const uProjectionLoc = gl.getUniformLocation(program, "u_projection")

    const uDiffuseLoc = gl.getUniformLocation(program, "u_diffuse")
    const uOpacityLoc = gl.getUniformLocation(program, "u_opacity")

    const newMeshDataArray = parsedObjs => {
        const newMeshData = () => ({
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

                data.faces = mesh.faces
                data.material = mesh.material

                const texture = gl.createTexture()
                data.texture = texture
                gl.bindTexture(gl.TEXTURE_2D, texture)
                // Filler white pixel texture to be replaced if a real texture is needed
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))

                if (mesh.material.diffuseMap) {
                    const image = new Image()
                    image.src = `models/${mesh.material.diffuseMap}`

                    image.onload = () => {
                        gl.bindTexture(gl.TEXTURE_2D, data.texture)
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
                        gl.generateMipmap(gl.TEXTURE_2D)
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

    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.clearColor(0.6, 0.74, 0.95, 1.0)

    let isInitialSetSize = true

    const zNear = 0.1
    const zFar = 500
    const fov = degrees_to_radians(90)


    const draw = frameTime => {
        // Handle resize
        if (isInitialSetSize || canvas.clientWidth !== targetCanvasWidth || canvas.clientHeight !== targetCanvasHeight) {
            gl.canvas.width = targetCanvasWidth
            gl.canvas.height = targetCanvasHeight
            aspect = canvas.clientWidth / canvas.clientHeight
            isInitialSetSize = false
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        }

        const projection = m4_perspective(fov, aspect, zNear, zFar)
    
        const cameraTarget = [0, 0, 0]
        const cameraPosition = [0, 7, 25]
        const up = [0, 1, 0]
        const camera = m4_look_at(cameraPosition, cameraTarget, up)
    
        const view = m4_inverse(camera)

        const world = m4_identity()

        gl.uniformMatrix4fv(uWorldLoc, false, world)
        gl.uniformMatrix4fv(uViewLoc, false, view)
        gl.uniformMatrix4fv(uProjectionLoc, false, projection)

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        sceneMeshData.forEach(data => {
            gl.bindVertexArray(data.vao)

            gl.uniform3fv(uDiffuseLoc, data.material.diffuse || [1.0, 1.0, 1.0])
            // gl.uniform3fv(uAmbientLoc, data.material.ambient)
            // gl.uniform3fv(uEmissiveLoc, data.material.emissive)
            // gl.uniform3fv(uSpecularLoc, data.material.specular)
            // gl.uniform1f(uShininessLoc, data.material.shininess)
            gl.uniform1f(uOpacityLoc, data.material.opacity)

            gl.bindTexture(gl.TEXTURE_2D, data.texture)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        })

        gl.drawArrays(gl.POINTS, 0, 1)

        requestAnimationFrame(draw)
    }

    draw()
}

main()