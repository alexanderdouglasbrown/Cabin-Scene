const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram()

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)

    if (success) {
        return program
    } else {
        console.error(gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
    }
}

const createShader = (gl, type, source) => {
    const shader = gl.createShader(type)

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

    if (success) {
        return shader
    } else {
        console.error(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
    }
}

export { createProgram, createShader }