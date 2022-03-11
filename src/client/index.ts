import Handlebars from 'handlebars'
import axios from 'axios'
import YAML from "yaml";
import fs from 'fs'
import {join} from 'path'
import process from 'node:process'
import {setHandlebarsHelpers} from "../helpers/handlebarsHelpers";

const pathParamRegex = /{(.*?)}/gi

setHandlebarsHelpers()

const formatPathParam = (path: string): string => {
    return path.split('/').map(element => {
        if (element.match(pathParamRegex)) {
            return element.replace('{', '${')
        } else {
            return element
        }
    }).join('/')
}

const getSchemaRefPath = (item: any): any => {
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

const setSchema = (item: any, schemaData: any): { [key: string]: any } => {
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

const writeOutput = (data: any[], filename = 'client') => {
    const outputDir = 'output/client'
    if (!fs.existsSync(join(process.cwd(), outputDir))) {
        fs.mkdirSync(join(process.cwd(), outputDir), {recursive: true})
    }

    const source = fs.readFileSync(join(process.cwd(), '/src/templates/client.hbs'), 'utf-8')
    const template = Handlebars.compile(source)
    const output = template(data)

    fs.writeFileSync(join(process.cwd(), `/${outputDir}/${filename}.ts`), output, 'utf-8')
}

export const generateClientCode = async (urls: string[], allowedPaths: string[] = []) => {
    for (const url of urls) {
        const splitUrl = url.split('/')
        const server = splitUrl.slice(0, splitUrl.length - 1).join('/')
        const filename = splitUrl[splitUrl.length - 1]

        let response = await axios.get(url)

        const data = YAML.parse(response.data)

        let pathsData: any = Object.keys(data.paths).map(key => Object.keys(data.paths[key]).map(method => ({
            pathName: formatPathParam(key),
            method, ...data.paths[key][method]
        }))).flat()

        let filenames = [...new Set(pathsData.map((path: any) => getSchemaRefPath(path)))]

        for (const filename of filenames) {
            response = await axios.get(`${server}/${filename}`)
            const schemaData = {[filename as string]: YAML.parse(response.data)}

            pathsData = setSchema(pathsData, schemaData)
        }

        pathsData = Object.values(pathsData)

        if (allowedPaths.length > 0) {
            pathsData = pathsData.filter((path: any) => allowedPaths.includes(path.pathName))
        }

        data.paths = pathsData

        writeOutput(data, filename.split('.')[0])
    }
}