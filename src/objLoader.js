// directory: no / at end
// file: no extension
const objLoader = async (directory, file) => {
    const mtlFile = await fetch(`${directory}/${file}.mtl`)
    const objFile = await fetch(`${directory}/${file}.obj`)

    const mtlText = await mtlFile.text()
    const objText = await objFile.text()

    const objParser = (objText, materials) => {
        const result = new Map()

        let mtllib = undefined
        const v = []
        const vt = []
        const vn = []

        const newMesh = mtlName => ({
            mtlName: mtlName,
            material: materials[mtlName],
            faces: 0,
            positions: [],
            textureCoords: [],
            normals: []
        })

        const newObject = objName => ({
            objName: objName,
            meshes: new Map()
        })

        let currentObj = null
        let currentMesh = null

        const lines = objText.split('\n')

        for (const line of lines) {
            const [command, ...data] = line.split(' ')

            if (command === 'mtllib') {
                if (!mtllib) {
                    mtllib = data.join(' ')
                } else {
                    console.error("Unhandled: Multiple mtllib")
                }
            }

            if (command === 'o') {
                if (currentObj) {
                    if (currentMesh)
                        currentObj.meshes.set(currentMesh.mtlName, currentMesh)

                    result.set(currentObj.objName, currentObj)
                }

                currentObj = newObject(data.join(' '))
                currentMesh = null
            }

            if (command === "usemtl") {
                const mtlName = data.join(' ')

                if (currentMesh)
                    currentObj.meshes.set(currentMesh.mtlName, currentMesh)

                currentMesh = newMesh(mtlName)
            }

            if (command === 'v') {
                const vArr = []
                for (const value of data)
                    vArr.push(Number(value))
                v.push(vArr)
            }

            if (command === 'vt') {
                const vtArr = []
                for (const value of data)
                    vtArr.push(Number(value))
                vt.push(vtArr)
            }

            if (command === 'vn') {
                const vnArr = []
                for (const value of data)
                    vnArr.push(Number(value))
                vn.push(vnArr)
            }

            if (command === 'f') {
                for (const meshData of data) {
                    const [vIndex, vtIndex, vnIndex] = meshData.split('/')

                    currentMesh.positions.push(...v[Number(vIndex) - 1])
                    currentMesh.textureCoords.push(...vt[Number(vtIndex) - 1])
                    currentMesh.normals.push(...vn[Number(vnIndex) - 1])

                    currentMesh.faces++
                }
            }
        }

        if (currentMesh.material)
            currentObj.meshes.set(currentMesh.mtlName, currentMesh)

        result.set(currentObj.objName, currentObj)

        return result
    }

    const mtlParser = mtlText => {
        const result = [] // eg "result["Icing"] = {}

        const newMaterial = () => ({
            material: undefined,
            shininess: undefined,
            ambient: undefined,
            diffuse: undefined,
            specular: undefined,
            emissive: undefined,
            // opticalDensity: undefined,
            opacity: undefined,
            // illum: undefined
            diffuseMap: undefined
        })

        let currentMaterial = newMaterial()

        const lines = mtlText.split('\n')

        for (const line of lines) {
            const [command, ...data] = line.split(' ')

            if (command === "newmtl") {
                if (currentMaterial.material === undefined) {
                    currentMaterial.material = data.join(' ')
                } else {
                    result[currentMaterial.material] = currentMaterial
                    currentMaterial = newMaterial()
                    currentMaterial.material = data.join(' ')
                }
            }

            if (command === "Ns")
                currentMaterial.shininess = Number(data[0])

            if (command === "Ka")
                currentMaterial.ambient = [...data.map(x => Number(x))]

            if (command === "Kd")
                currentMaterial.diffuse = [...data.map(x => Number(x))]

            if (command === "Ks")
                currentMaterial.specular = [...data.map(x => Number(x))]

            if (command === "Ke")
                currentMaterial.emissive = [...data.map(x => Number(x))]

            // if (command === "Ni")
            //     currentMaterial.opticalDensity = Number(data[0])

            if (command === "d")
                currentMaterial.opacity = Number(data[0])

            // if (command === "illum")
            //     currentMaterial.illum = Number(data[0])

            if (command === "map_Kd")
                currentMaterial.diffuseMap = data.join(' ')

            if (currentMaterial.material)
                result[currentMaterial.material] = currentMaterial
        }
        return result
    }

    const materials = mtlParser(mtlText)

    return objParser(objText, materials)
}

export default objLoader