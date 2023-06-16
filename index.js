import('./pkg').catch(console.error)

// import objLoader from './src/objLoader'
import createShader from './src/createShader'
import createProgram from './src/createProgram'

const vertexShaderGLSL = `#version 300 es

in vec4 a_position;

void main() {
    gl_Position = a_position;
}
`

const fragmentShaderGLSL = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
    outColor = vec4(1, 1, 1, 1);
}
`

const main = async () => {
    const canvas = document.querySelector("#canvas")
    const gl = canvas.getContext("webgl2")

    if (!gl) {
        console.error("WebGL failed to load")
        return
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderGLSL)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderGLSL)
    const program = createProgram(gl, vertexShader, fragmentShader)

    const draw = () => {
        requestAnimationFrame(draw)
    }

    draw()
}

main()