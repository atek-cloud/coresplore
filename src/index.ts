#!/usr/bin/env node

import path from 'path'
import os from 'os'
import fs from 'fs'
import minimist from 'minimist'
import createExpressApp, * as express from 'express'
import bodyParser from 'body-parser'
import basicAuth from 'express-basic-auth'
import ansi from 'ansi-escapes'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { setup } from './hyper.js'
import { api } from './api.js'

const __dirname = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = minimist(process.argv)
const port = args.port || args.p ? Number(args.port || args.p) : 2000
const storagePath = args.storage || path.join(os.homedir(), '.coresplore')
const password = args.password

console.log('Storing Hypercore data in', storagePath)
try {
  fs.statSync(storagePath)
} catch (e) {
  fs.mkdirSync(storagePath, {recursive: true})
}
setup({storagePath})

const app = createExpressApp()
if (password) {
  console.log('Basic auth enabled, username is "admin"')
  app.use(basicAuth({users: {admin: password}, challenge: true}))
}
app.use(bodyParser.json())
app.use('/_api', api)
app.use(express.static(join(__dirname, 'frontend')))
app.use((req: any, res: any) => res.sendFile(join(__dirname, 'frontend/index.html')))
app.listen(port, () => {
  const link = `http://localhost:${port}/`
  console.log(`Coresplore server running at: ${ansi.link(link, link)}`)
})