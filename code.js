(function main() {
    const timeSlider = document.querySelector("#tod")
    const clock = document.querySelector("#clock")

    const skyBox = document.querySelector("#sky")
    const warmthBox = document.querySelector("#warmth")

    const update = () => {
        const steps = 24
        const time = timeSlider.value
        clock.textContent = `${time}:00`

        const getColor = (min, max) => {
            return (time / steps) * (max - min) + min
        }
        const skyR = getColor(43, 230)
        const skyG = getColor(47, 255)
        const skyB = getColor(119, 255)

        skyBox.style.backgroundColor = `rgb(${skyR}, ${skyG}, ${skyB})`

        warmthBox.style.backgroundColor = `rgb(255, 255, 255)`

        requestAnimationFrame(update)
    }

    update()
})()