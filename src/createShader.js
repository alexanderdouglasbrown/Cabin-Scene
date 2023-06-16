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

export default createShader