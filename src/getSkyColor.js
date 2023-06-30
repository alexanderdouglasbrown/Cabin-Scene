const getSkyColor = lightAngle => {
    const dayR = 183
    const dayG = 214
    const dayB = 238

    const nightR = 22
    const nightG = 27
    const nightB = 47

    let r, g, b

    const getColor = (currVal, angleRange, colorChannel1, colorChannel2) => {
        return (currVal / angleRange) * (colorChannel2 - colorChannel1) + colorChannel1
    }

    const rgbToZeroOne = colorChannel => {
        return colorChannel / 255
    }

    if (lightAngle >= 15 && lightAngle < 175) {
        r = dayR
        g = dayG
        b = dayB
    } else if (lightAngle >= 175 && lightAngle < 205) {
        const shiftedZ = lightAngle - 175
        const angleRange = 30
        r = getColor(shiftedZ, angleRange, dayR, nightR)
        g = getColor(shiftedZ, angleRange, dayG, nightG)
        b = getColor(shiftedZ, angleRange, dayB, nightB)
    } else if (lightAngle >= 205 && lightAngle < 345) {
        r = nightR
        g = nightG
        b = nightB
    } else {
        const shiftedZ = (lightAngle + 15) % 360
        const angleRange = 30
        r = getColor(shiftedZ, angleRange, nightR, dayR)
        g = getColor(shiftedZ, angleRange, nightG, dayG)
        b = getColor(shiftedZ, angleRange, nightB, dayB)

    }
    return [rgbToZeroOne(r), rgbToZeroOne(g), rgbToZeroOne(b)]
}

export default getSkyColor