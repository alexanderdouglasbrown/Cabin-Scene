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

export default createProgram