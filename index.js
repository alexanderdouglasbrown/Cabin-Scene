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

const handleResize = (gl) => {
    gl.canvas.width = gl.canvas.clientWidth
    gl.canvas.height = gl.canvas.clientHeight

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
}

const main = async () => {
    const canvas = document.querySelector("#canvas")
    const gl = canvas.getContext("webgl2")

    handleResize(gl)

    if (!gl) {
        console.error("WebGL failed to load")
        return
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderGLSL)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderGLSL)
    const program = createProgram(gl, vertexShader, fragmentShader)

    gl.useProgram(program)

    const draw = () => {
        if (canvas.clientWidth !== canvas.width || canvas.clientHeight !== canvas.height)
            handleResize(gl)

        gl.drawArrays(gl.POINTS, 0, 1)

        requestAnimationFrame(draw)
    }

    draw()
}

main()