import { degrees_to_radians, m4_perspective, m4_look_at, m4_inverse, m4_y_rotation, m4_z_rotation, m4_identity, m4_translation, m4_scaling, m4_multiply, m4_x_rotation, normalize } from './pkg'

import objLoader from './src/objLoader'
import { createShader, createProgram } from './src/shaderFunctions'
import getSkyColor from './src/getSkyColor'

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
    let cameraDistance = 50

    const handleMouseMove = () => {
        // Mouse
        if (isMouseDown) {
            const xFactor = gl.canvas.clientWidth * 0.275
            const yFactor = gl.canvas.clientHeight * 0.275
            if (lastMouseX != null) {
                cameraRotationX += (mouseX - lastMouseX) * xFactor
                cameraRotationY += (mouseY - lastMouseY) * yFactor
            }

            if (cameraRotationY < 181)
                cameraRotationY = 181
            if (cameraRotationY > 360)
                cameraRotationY = 360
            cameraRotationX = cameraRotationX % 360

            lastMouseX = mouseX
            lastMouseY = mouseY
        }
    }

    const MIN_ZOOM = 20
    const MAX_ZOOM = 150
    const handleZoom = zoom => {
        cameraDistance += zoom

        if (cameraDistance > MAX_ZOOM)
            cameraDistance = MAX_ZOOM
        if (cameraDistance < MIN_ZOOM)
            cameraDistance = MIN_ZOOM
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
        e.preventDefault()
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
                handleZoom((prevTouchDistance - currentDistance) * 0.3)

            prevTouchDistance = currentDistance
        } else {
            const rect = canvas.getBoundingClientRect()
            mouseX = ((e.touches[0].clientX - rect.left) / gl.canvas.clientWidth)
            mouseY = ((e.touches[0].clientY - rect.top) / gl.canvas.clientHeight)

            handleMouseMove()
        }
    })
    gl.canvas.addEventListener('wheel', e => {
        handleZoom(e.deltaY * 0.0325)
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
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

    setOverlay("Loading shaders")

    // Scene shaders
    const sceneVertexShader = createShader(gl, gl.VERTEX_SHADER, await (await fetch(`shaders/SceneVertexShader.glsl`)).text())
    const sceneFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, await (await fetch(`shaders/SceneFragmentShader.glsl`)).text())
    const sceneProgram = createProgram(gl, sceneVertexShader, sceneFragmentShader)

    const aPositionLoc = gl.getAttribLocation(sceneProgram, "a_position")
    const aNormalLoc = gl.getAttribLocation(sceneProgram, "a_normal")
    const aTextureCoordLoc = gl.getAttribLocation(sceneProgram, "a_textureCoord")

    const uWorldLoc = gl.getUniformLocation(sceneProgram, "u_world")
    const uViewLoc = gl.getUniformLocation(sceneProgram, "u_view")
    const uProjectionLoc = gl.getUniformLocation(sceneProgram, "u_projection")
    const uTextureMatrixLoc = gl.getUniformLocation(sceneProgram, "u_textureMatrix")

    const uIsReflection = gl.getUniformLocation(sceneProgram, "u_isReflection")
    const uReflectionHeight = gl.getUniformLocation(sceneProgram, "u_reflectionHeight")

    const uDiffuseMapLoc = gl.getUniformLocation(sceneProgram, "u_diffuseMap")
    const uProjectedTextureLoc = gl.getUniformLocation(sceneProgram, "u_projectedTexture")
    const uLightDirectionLoc = gl.getUniformLocation(sceneProgram, "u_lightDirection")
    const uLightIntensityLoc = gl.getUniformLocation(sceneProgram, "u_lightIntensity")
    const uDiffuseLoc = gl.getUniformLocation(sceneProgram, "u_diffuse")
    const uOpacityLoc = gl.getUniformLocation(sceneProgram, "u_opacity")

    // Shadow shader
    const shadowVertexShader = createShader(gl, gl.VERTEX_SHADER, await (await fetch(`shaders/ShadowVertexShader.glsl`)).text())
    const shadowFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, await (await fetch(`shaders/ShadowFragmentShader.glsl`)).text())
    const shadowProgram = createProgram(gl, shadowVertexShader, shadowFragmentShader)

    const aShadowPositionLoc = gl.getAttribLocation(shadowProgram, "a_position")
    const uShadowWorldLoc = gl.getUniformLocation(shadowProgram, "u_world")
    const uShadowViewLoc = gl.getUniformLocation(shadowProgram, "u_view")
    const uShadownProjectionLoc = gl.getUniformLocation(shadowProgram, "u_projection")

    // Sun shader
    const sunVertexShader = createShader(gl, gl.VERTEX_SHADER, await (await fetch(`shaders/SunVertexShader.glsl`)).text())
    const sunFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, await (await fetch(`shaders/SunFragmentShader.glsl`)).text())
    const sunProgram = createProgram(gl, sunVertexShader, sunFragmentShader)

    const aSunPositionLoc = gl.getAttribLocation(sunProgram, "a_position")
    const aSunTextureCoordLoc = gl.getAttribLocation(sunProgram, "a_textureCoord")
    const uSunWorldLoc = gl.getUniformLocation(sunProgram, "u_world")
    const uSunViewLoc = gl.getUniformLocation(sunProgram, "u_view")
    const uSunProjectionLoc = gl.getUniformLocation(sunProgram, "u_projection")

    const uSunLightIntensityLoc = gl.getUniformLocation(sunProgram, "u_lightIntensity")

    // Sky Sphere shader
    const skySphereVertexShader = createShader(gl, gl.VERTEX_SHADER, await (await fetch(`shaders/SkySphereVertexShader.glsl`)).text())
    const skySphereFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, await (await fetch(`shaders/SkySphereFragmentShader.glsl`)).text())
    const skySphereProgram = createProgram(gl, skySphereVertexShader, skySphereFragmentShader)

    const aSkySpherePositionLoc = gl.getAttribLocation(skySphereProgram, "a_position")
    const aSkySphereTextureCoordLoc = gl.getAttribLocation(skySphereProgram, "a_textureCoord")
    const uSkySphereWorldLoc = gl.getUniformLocation(skySphereProgram, "u_world")
    const uSkySphereViewLoc = gl.getUniformLocation(skySphereProgram, "u_view")
    const uSkySphereProjectionLoc = gl.getUniformLocation(skySphereProgram, "u_projection")

    const uSkySphereVisibilityLoc = gl.getUniformLocation(skySphereProgram, "u_visibility")

    // Water shader
    const waterVertexShader = createShader(gl, gl.VERTEX_SHADER, await (await fetch(`shaders/WaterVertexShader.glsl`)).text())
    const waterFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, await (await fetch(`shaders/WaterFragmentShader.glsl`)).text())
    const waterProgram = createProgram(gl, waterVertexShader, waterFragmentShader)

    const aWaterPositionLoc = gl.getAttribLocation(waterProgram, "a_position")
    const aWaterNormalLoc = gl.getAttribLocation(waterProgram, "a_normal")
    const aWaterTextureCoordLoc = gl.getAttribLocation(waterProgram, "a_textureCoord")

    const uWaterWorldLoc = gl.getUniformLocation(waterProgram, "u_world")
    const uWaterViewLoc = gl.getUniformLocation(waterProgram, "u_view")
    const uWaterProjectionLoc = gl.getUniformLocation(waterProgram, "u_projection")
    const uWaterTextureMatrixLoc = gl.getUniformLocation(waterProgram, "u_textureMatrix")

    const uWaterReflectionDiffuseMap = gl.getUniformLocation(waterProgram, "u_reflectionDiffuseMap")
    const uWaterDiffuseMapLoc = gl.getUniformLocation(waterProgram, "u_diffuseMap")
    const uWaterShadowDiffuseMapLoc = gl.getUniformLocation(waterProgram, "u_projectedTexture")

    const uWaterLightDirectionLoc = gl.getUniformLocation(waterProgram, "u_lightDirection")
    const uWaterLightIntensityLoc = gl.getUniformLocation(waterProgram, "u_lightIntensity")
    const uWaterOpacityLoc = gl.getUniformLocation(waterProgram, "u_opacity")

    // Load models
    setOverlay("Loading models")
    const sceneMesh = await objLoader('./models', 'scene')

    sceneMesh.delete("Clouds")

    const waterMesh = new Map([["Water", sceneMesh.get("Water")]])
    sceneMesh.delete("Water")

    const skySphereMesh = await objLoader('./models', 'skysphere')
    const cloudsMesh = await objLoader('./models', 'clouds')
    const sunMesh = await objLoader('./models', 'sun')

    const loadingImagesSet = new Set()
    const loadTexture = path => {
        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        // Filler white pixel texture to be replaced if a real texture is needed
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))

        if (path) {
            const image = new Image()
            image.src = path
            loadingImagesSet.add(path)

            // The use of setOverlay() here causes a race condition if I decide to do something else with that function down the line
            setOverlay("Loading textures")

            image.onload = e => {
                gl.bindTexture(gl.TEXTURE_2D, texture)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
                gl.generateMipmap(gl.TEXTURE_2D)

                loadingImagesSet.delete(path)
                if (loadingImagesSet.size === 0)
                    setOverlay(null)
            }
        }

        return texture
    }

    // Very rigid
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

                data.texture = loadTexture(mesh.material.diffuseMap ? `models/${mesh.material.diffuseMap}` : null)

                if (positionLoc || positionLoc === 0 || shadowPositionLoc || shadowPositionLoc === 0) {
                    data.posBuffer = gl.createBuffer()
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW)
                }

                if (normalLoc || normalLoc === 0) {
                    data.normalBuffer = gl.createBuffer()
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer)
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW)
                }

                if (textureCoordLoc || textureCoordLoc === 0) {
                    data.textureCoordBuffer = gl.createBuffer()
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.textureCoordBuffer)
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.textureCoords), gl.STATIC_DRAW)
                }

                if (shadowPositionLoc || shadowPositionLoc === 0) {
                    data.shadowVAO = gl.createVertexArray()
                    gl.bindVertexArray(data.shadowVAO)

                    gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                    gl.vertexAttribPointer(shadowPositionLoc, 3, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(shadowPositionLoc)

                    gl.bindVertexArray(null)
                }

                data.vao = gl.createVertexArray()
                gl.bindVertexArray(data.vao)

                if (positionLoc || positionLoc === 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.posBuffer)
                    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(positionLoc)
                }

                if (normalLoc || normalLoc === 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.normalBuffer)
                    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(normalLoc)
                }

                if (textureCoordLoc || textureCoordLoc === 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, data.textureCoordBuffer)
                    gl.vertexAttribPointer(textureCoordLoc, 2, gl.FLOAT, false, 0, 0)
                    gl.enableVertexAttribArray(textureCoordLoc)
                }

                gl.bindVertexArray(null)

                result.push(data)
            })
        })

        return result
    }

    const sceneMeshData = newMeshDataArray(sceneMesh, aPositionLoc, aNormalLoc, aTextureCoordLoc, aShadowPositionLoc)
    const cloudsMeshData = newMeshDataArray(cloudsMesh, aPositionLoc, aNormalLoc, aTextureCoordLoc)[0]
    const waterReflectionData = newMeshDataArray(waterMesh, aWaterPositionLoc, aWaterNormalLoc, aWaterTextureCoordLoc)[0]
    const sunMeshData = newMeshDataArray(sunMesh, aSunPositionLoc, null, aSunTextureCoordLoc)
    const skySphereData = newMeshDataArray(skySphereMesh, aSkySpherePositionLoc, null, aSkySphereTextureCoordLoc)
    const sleepySunTexture = loadTexture('./models/sleepy-sun.png')
    const moonTexture = loadTexture('./models/moon.png')

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

    // Water Reflection
    const reflectionTexture = gl.createTexture()
    const reflectionTextureSize = 2048
    gl.bindTexture(gl.TEXTURE_2D, reflectionTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, reflectionTextureSize, reflectionTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    const reflectionFrameBuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflectionFrameBuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reflectionTexture, 0)
    const reflectionDepthBuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, reflectionDepthBuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, reflectionTextureSize, reflectionTextureSize)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, reflectionDepthBuffer)

    const starVisibility = lightAngle => {
        if (lightAngle >= 5.0 && lightAngle < 175.0) {
            return 0.0
        } else if (lightAngle >= 175.0 && lightAngle < 185.0) {
            return (lightAngle - 175.0) / 10.0
        } else if (lightAngle >= 185.0 && lightAngle < 355.0) {
            return 1.0
        } else {
            if (lightAngle >= 355.0)
                return 1.0 - ((lightAngle - 355.0) / 10.0)
            else
                return 1.0 - (lightAngle / 10.0 + 0.5)
        }
    }

    const waterHeight = 0.698133
    const lightDistance = 25
    const sunScale = 20
    const sunDistance = 300

    let isInitialSetSize = true

    const zNear = 0.1
    const zFar = 1500.0
    const fov = degrees_to_radians(45) // y-axis FOV

    const cameraTarget = [0, 0, 0]
    const up = [0, 1, 0]

    gl.useProgram(sceneProgram)
    gl.uniform1f(uIsReflection, 0.0)
    gl.uniform1f(uReflectionHeight, waterHeight)

    let cameraRotationX = 110
    let cameraRotationY = 290

    const draw = frameTime => {
        // Handle resize
        if (isInitialSetSize || canvas.clientWidth !== targetCanvasWidth || canvas.clientHeight !== targetCanvasHeight) {
            gl.canvas.width = targetCanvasWidth
            gl.canvas.height = targetCanvasHeight
            aspect = canvas.clientWidth / canvas.clientHeight
            isInitialSetSize = false
        }

        // let lightAngle = 120
        let lightAngle = (320 + (frameTime || 1) * 0.002) % 360
        if (lightAngle < 0)
            lightAngle += 360

        let lightPosMatrix = m4_identity()
        lightPosMatrix = m4_multiply(lightPosMatrix, m4_z_rotation(degrees_to_radians(lightAngle)))
        lightPosMatrix = m4_multiply(lightPosMatrix, m4_y_rotation(degrees_to_radians(5)))
        const lightPos = [lightPosMatrix[0] * lightDistance, lightPosMatrix[1] * lightDistance, lightPosMatrix[2] * lightDistance]

        const lightVector = normalize(lightPos)

        const cameraX = Math.sin(degrees_to_radians(cameraRotationY)) * Math.cos(degrees_to_radians(cameraRotationX)) * cameraDistance
        const cameraY = Math.cos(degrees_to_radians(cameraRotationY)) * cameraDistance
        const cameraZ = Math.sin(degrees_to_radians(cameraRotationY)) * Math.sin(degrees_to_radians(cameraRotationX)) * cameraDistance
        const cameraPosition = [cameraX, cameraY, cameraZ]
        const camera = m4_look_at(cameraPosition, cameraTarget, up)
        const view = m4_inverse(camera)

        const projection = m4_perspective(fov, aspect, zNear, zFar)

        const landSpin = (frameTime || 1) * -0.000025
        const landWorld = m4_y_rotation(landSpin)

        // Sky color
        const skyColor = getSkyColor(lightAngle)
        gl.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0)
        const lightIntensity = Math.min((skyColor[0] + skyColor[1] + skyColor[2]) / 3 + 0.4, 1.0)

        // Shadow
        gl.useProgram(shadowProgram)
        const shadowView = m4_inverse(m4_look_at(lightPos, cameraTarget, up))
        const shadowProjection = m4_perspective(degrees_to_radians(95), 1, zNear, zFar)
        gl.uniformMatrix4fv(uShadowWorldLoc, false, landWorld)
        gl.uniformMatrix4fv(uShadowViewLoc, false, shadowView)
        gl.uniformMatrix4fv(uShadownProjectionLoc, false, shadowProjection)

        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer)
        gl.viewport(0, 0, depthTextureSize, depthTextureSize)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        sceneMeshData.forEach(data => {
            gl.bindVertexArray(data.shadowVAO)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        })

        // Water Reflection
        gl.useProgram(sceneProgram)
        gl.uniformMatrix4fv(uWorldLoc, false, landWorld)
        let reflectedView = m4_look_at([cameraPosition[0], cameraPosition[1] * -1, cameraPosition[2]], cameraTarget, up)
        reflectedView = m4_multiply(reflectedView, m4_translation(0, 2 * waterHeight, 0))
        reflectedView = m4_inverse(reflectedView)
        gl.uniformMatrix4fv(uViewLoc, false, reflectedView)
        gl.uniformMatrix4fv(uProjectionLoc, false, projection)

        gl.uniform1f(uIsReflection, 1.0)

        gl.bindFramebuffer(gl.FRAMEBUFFER, reflectionFrameBuffer)
        gl.viewport(0, 0, reflectionTextureSize, reflectionTextureSize)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.uniformMatrix4fv(uWorldLoc, false, landWorld)
        sceneMeshData.forEach(data => {
            gl.bindVertexArray(data.vao)

            gl.uniform3fv(uDiffuseLoc, data.material.diffuse || [1.0, 1.0, 1.0])
            gl.uniform1f(uOpacityLoc, data.material.opacity)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, data.texture)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, depthTexture)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        })
        gl.uniform1f(uIsReflection, 0.0)

        // Sun
        gl.useProgram(sunProgram)

        gl.uniformMatrix4fv(uSunViewLoc, false, reflectedView)
        gl.uniformMatrix4fv(uSunProjectionLoc, false, projection)
        gl.uniform1f(uSunLightIntensityLoc, lightIntensity)

        // Blender's exported default rotation was not ideal
        const sunRotateX = degrees_to_radians(180)
        const sunRotateY = degrees_to_radians(90)
        const sunRotateZ = degrees_to_radians(180)

        // Order matters -- scale, rotate, transform (SRT) order, but also you apply it in reverse
        const sunPos = [lightVector[0] * sunDistance, lightVector[1] * sunDistance, lightVector[2] * sunDistance]
        let sunWorld = m4_identity()
        sunWorld = m4_multiply(sunWorld, m4_translation(sunPos[0], sunPos[1], sunPos[2]))
        sunWorld = m4_multiply(sunWorld, m4_translation(cameraPosition[0], cameraPosition[1], cameraPosition[2]))
        sunWorld = m4_multiply(sunWorld, m4_look_at(sunPos, [0.0, 0.0, 0.0], up))
        sunWorld = m4_multiply(sunWorld, m4_z_rotation(sunRotateZ))
        sunWorld = m4_multiply(sunWorld, m4_y_rotation(sunRotateY))
        sunWorld = m4_multiply(sunWorld, m4_x_rotation(sunRotateX))
        sunWorld = m4_multiply(sunWorld, m4_scaling(sunScale, sunScale, sunScale))
        gl.uniformMatrix4fv(uSunWorldLoc, false, sunWorld)

        const drawSun = () => {
            sunMeshData.forEach(data => {
                gl.bindVertexArray(data.vao)

                gl.activeTexture(gl.TEXTURE0)

                if (lightAngle >= 5 && lightAngle < 175) {
                    gl.bindTexture(gl.TEXTURE_2D, data.texture) // sun texture
                } else if (lightAngle >= 175 && lightAngle < 185) {
                    gl.bindTexture(gl.TEXTURE_2D, sleepySunTexture)
                } else if (lightAngle >= 185 && lightAngle < 355) {
                    gl.bindTexture(gl.TEXTURE_2D, moonTexture)
                } else {
                    gl.bindTexture(gl.TEXTURE_2D, sleepySunTexture)
                }

                gl.drawArrays(gl.TRIANGLES, 0, data.faces)
            })
        }
        drawSun()

        gl.uniformMatrix4fv(uSunViewLoc, false, view)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        drawSun()

        //Scene
        gl.useProgram(sceneProgram)

        gl.uniformMatrix4fv(uWorldLoc, false, landWorld)
        gl.uniformMatrix4fv(uViewLoc, false, view)
        gl.uniformMatrix4fv(uProjectionLoc, false, projection)

        gl.uniform1f(uLightIntensityLoc, lightIntensity)

        gl.uniform3fv(uLightDirectionLoc, lightVector)
        gl.uniform1i(uDiffuseMapLoc, 0)
        gl.uniform1i(uProjectedTextureLoc, 1)

        let textureMatrix = m4_identity()
        textureMatrix = m4_multiply(textureMatrix, m4_translation(0.5, 0.5, 0.5))
        textureMatrix = m4_multiply(textureMatrix, m4_scaling(0.5, 0.5, 0.5))

        textureMatrix = m4_multiply(textureMatrix, shadowProjection)
        textureMatrix = m4_multiply(textureMatrix, shadowView)

        gl.uniformMatrix4fv(uTextureMatrixLoc, false, textureMatrix)

        sceneMeshData.forEach(data => {
            gl.bindVertexArray(data.vao)

            gl.uniform3fv(uDiffuseLoc, data.material.diffuse || [1.0, 1.0, 1.0])

            gl.uniform1f(uOpacityLoc, data.material.opacity)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, data.texture)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, depthTexture)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        })

        // Clouds
        gl.disable(gl.CULL_FACE)
        let cloudWorld = m4_identity()
        cloudWorld = m4_multiply(cloudWorld, m4_translation(0, -8.2, 0))
        cloudWorld = m4_multiply(cloudWorld, m4_y_rotation(landSpin * 4))
        cloudWorld = m4_multiply(cloudWorld, m4_scaling(20, 10, 20))
        gl.uniformMatrix4fv(uWorldLoc, false, cloudWorld)
        gl.bindVertexArray(cloudsMeshData.vao)
        gl.uniform3fv(uDiffuseLoc, cloudsMeshData.material.diffuse || [1.0, 1.0, 1.0])
        gl.uniform1f(uOpacityLoc, cloudsMeshData.material.opacity)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, cloudsMeshData.texture)
        gl.drawArrays(gl.TRIANGLES, 0, cloudsMeshData.faces)
        gl.enable(gl.CULL_FACE)

        // Sky Sphere
        gl.useProgram(skySphereProgram)

        gl.uniformMatrix4fv(uSkySphereProjectionLoc, false, projection)
        gl.uniformMatrix4fv(uSkySphereViewLoc, false, view)

        const skySphereScale = 1000.0
        let skySphereWorld = m4_identity()
        skySphereWorld = m4_multiply(skySphereWorld, m4_translation(cameraPosition[0], cameraPosition[1], cameraPosition[2]))
        skySphereWorld = m4_multiply(skySphereWorld, m4_scaling(skySphereScale, skySphereScale, skySphereScale))

        gl.uniform1f(uSkySphereVisibilityLoc, starVisibility(lightAngle))

        gl.uniformMatrix4fv(uSkySphereWorldLoc, false, skySphereWorld)

        skySphereData.forEach(data => {
            gl.bindVertexArray(data.vao)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, data.texture)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        })

        gl.bindFramebuffer(gl.FRAMEBUFFER, reflectionFrameBuffer)
        gl.viewport(0, 0, reflectionTextureSize, reflectionTextureSize)
        gl.uniformMatrix4fv(uSkySphereViewLoc, false, reflectedView)
        skySphereData.forEach(data => {
            gl.bindVertexArray(data.vao)

            gl.drawArrays(gl.TRIANGLES, 0, data.faces)
        })
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        // Water
        gl.useProgram(waterProgram)

        gl.uniformMatrix4fv(uWaterWorldLoc, false, landWorld)
        gl.uniformMatrix4fv(uWaterViewLoc, false, view)
        gl.uniformMatrix4fv(uWaterProjectionLoc, false, projection)

        gl.uniform1f(uWaterLightIntensityLoc, lightIntensity)

        gl.uniform3fv(uWaterLightDirectionLoc, lightVector)
        gl.uniform1i(uWaterReflectionDiffuseMap, 0)
        gl.uniform1i(uWaterDiffuseMapLoc, 1)
        gl.uniform1i(uWaterShadowDiffuseMapLoc, 2)
        gl.bindVertexArray(waterReflectionData.vao)
        gl.uniform1f(uWaterOpacityLoc, 1)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, reflectionTexture)
        gl.uniform1f(uWaterOpacityLoc, waterReflectionData.material.opacity)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, waterReflectionData.texture)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_2D, depthTexture)

        let waterMatrix = m4_identity()
        waterMatrix = m4_multiply(waterMatrix, m4_translation(0.5, 0.5, 0.5))
        waterMatrix = m4_multiply(waterMatrix, m4_scaling(0.5, 0.5, 0.5))

        waterMatrix = m4_multiply(waterMatrix, projection)
        waterMatrix = m4_multiply(waterMatrix, reflectedView)
        gl.uniformMatrix4fv(uWaterTextureMatrixLoc, false, waterMatrix)

        gl.drawArrays(gl.TRIANGLES, 0, waterReflectionData.faces)

        requestAnimationFrame(draw)
    }

    draw()
}

main()