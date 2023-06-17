import('./pkg').catch(console.error)

// import objLoader from './src/objLoader'
import { createShader, createProgram } from './src/shaderFunctions'

const vertexShaderGLSL = `#version 300 es

in vec4 a_position;

void main() {
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    gl_PointSize = 15.0;
    // gl_Position = a_position;
}
`

const fragmentShaderGLSL = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
    outColor = vec4(1, 0, 1, 1);
}
`

const main = async () => {
    const setOverlay = msg => {
        document.querySelector("#overlay").textContent = msg
    }

    const canvas = document.querySelector("#canvas")
    const gl = canvas.getContext("webgl2")

    const handleResize = (gl, ro) => {
        gl.canvas.width = gl.canvas.clientWidth
        gl.canvas.height = gl.canvas.clientHeight

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        setOverlay(`${gl.canvas.width}x${gl.canvas.height}`)
    }

    handleResize(gl) // Setting initial size
    // const resizeObserver = new ResizeObserver(ro => setOverlay(`${ro[0].devicePixelContentBoxSize[0].inlineSize}x${ro[0].devicePixelContentBoxSize[0].blockSize}`)) // Listen for canvas size changes
    // const resizeObserver = new ResizeObserver(ro => console.log(ro)) // Listen for canvas size changes
    // try {
    //     resizeObserver.observe(canvas, { box: "device-pixel-content-box" })
    // } catch {
    //     resizeObserver.observe(canvas, { box: "content-box" })
    // }


    if (!gl) {
        console.error("WebGL failed to load")
        return
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderGLSL)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderGLSL)
    const program = createProgram(gl, vertexShader, fragmentShader)

    gl.useProgram(program)

    gl.clearColor(0.7, 0.7, 0.9, 1.0)

    const draw = () => {
        if (canvas.clientWidth !== canvas.width || canvas.clientHeight !== canvas.height)
            handleResize(gl)


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.drawArrays(gl.POINTS, 0, 1)

        requestAnimationFrame(draw)
    }

    draw()
}

main()