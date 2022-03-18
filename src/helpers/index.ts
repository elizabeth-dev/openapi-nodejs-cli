import fs from "fs"
import path from "path"
import process from "process"
import Handlebars from "handlebars"
import axios from "axios";

export { setHandlebarsHelpers } from './handlebarsHelpers'

export const writeOutputFile = (data: any[], templateName: 'client' | 'server', outputDir: string = 'output', filename: string) => {
    if (!fs.existsSync(path.join(process.cwd(), outputDir))) {
        fs.mkdirSync(path.join(process.cwd(), outputDir), {recursive: true})
    }

    const source = fs.readFileSync(path.join(process.cwd(), `/src/templates/${templateName}.hbs`), 'utf-8')
    const template = Handlebars.compile(source)
    const output = template(data)

    fs.writeFileSync(path.join(process.cwd(), `/${outputDir}/${filename}.ts`), output, 'utf-8')
}

export const getSchemaRefPath = (item: any): any => {
    let schemaFilename
    for (const key of Object.keys(item)) {
        if (typeof item[key] !== 'object') {
            continue
        }

        if (!Object.keys(item).includes('schema')) {
            schemaFilename = getSchemaRefPath(item[key])

            if (schemaFilename !== undefined) {
                return schemaFilename
            }

            continue
        }

        if (!Object.keys(item.schema).includes('$ref')) {
            continue
        }

        schemaFilename = item.schema.$ref.split('#')[0]
    }

    return schemaFilename
}

export const setSchema = (item: any, schemaData: any): { [key: string]: any } => {
    const newItem: { [key: string]: any } = {}
    for (const key of Object.keys(item)) {
        if (typeof item[key] !== 'object') {
            newItem[key] = item[key]
            continue
        }

        if (!Object.keys(item).includes('schema')) {
            if (item[key] instanceof Array) {
                newItem[key] = item[key]
                continue
            }

            newItem[key] = setSchema(item[key], schemaData)
            continue
        }

        if (!Object.keys(item.schema).includes('$ref')) {
            newItem[key] = item[key]
            continue
        }

        const schemaFilename = item.schema.$ref.split('#')[0]
        if (Object.keys(schemaData).includes(schemaFilename)) {
            newItem.schema = {...item.schema, ...schemaData[schemaFilename].components.schema}
        }
    }

    return newItem
}

export const getSpecificationFile = async (inputString: string): Promise<{ file: string, isUrl: boolean }> => {
    let file: string = ''
    let isUrl = false
    if (inputString.startsWith('http')) {
        let response = await axios.get(inputString)
        return { file: response.data, isUrl: true }
    }
    file = fs.readFileSync(inputString, "utf-8")
    return { file, isUrl }
}

export const getFilenameAndServer = (inputString: string): {server: string, filename: string} => {
    const splitInputString = inputString.split('/')
    const server = splitInputString.slice(0, splitInputString.length - 1).join('/')
    const filename = splitInputString[splitInputString.length - 1]

    return {server, filename}
}