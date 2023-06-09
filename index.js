import init, { add } from "./pkg/cabin_scene.js"

init().then(() => {
    document.body.textContent = `1 + 2 = ${add(1, 2)}`
});