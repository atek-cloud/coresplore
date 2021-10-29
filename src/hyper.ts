import path from 'path'
// @ts-ignore -prf
import Corestore from 'corestore'
// @ts-ignore -prf
import Hyperswarm from 'hyperswarm'
import Hyperbee from 'hyperbee'
// @ts-ignore -prf
import HyperbeeMessages from 'hyperbee/lib/messages.js'
// @ts-ignore -prf
import pump from 'pump'
import concat from 'concat-stream'
import { toBase32, fromBase32, jsonSyncer } from './util.js'

let store: Corestore
let swarm: Hyperswarm
let config: any
const cores: Map<string, any> = new Map()
const bees: Map<string, any> = new Map()

export interface DbRecord {
  key: string
  secretKey?: string
  type: string
  writable: boolean
  alias?: string
  access?: string
}

export function setup (opts: {storagePath: string}) {
  config = jsonSyncer(path.join(opts.storagePath, 'config.json'))
  store = new Corestore(opts.storagePath)
  swarm = new Hyperswarm()
  swarm.on('connection', (connection: any) => store.replicate(connection))
}

export async function getCore (key: string) {
  let core = cores.get(key)
  if (!core) {
    const dbRecord = getDbRecord(key)
    if (dbRecord && dbRecord.secretKey) {
      core = store.get({publicKey: fromBase32(key), secretKey: fromBase32(dbRecord.secretKey)})
    } else {
      core = store.get(fromBase32(key))
    }
    await initCore(core, !(dbRecord?.access === 'private'))
    cores.set(key, core)
  }
  return core
}

export async function createCore (keyPair: any) {
  const core = store.get(keyPair)
  await initCore(core, false)
  cores.set(toBase32(core.key), core)
  return core
}

export async function initCore (core: any, shouldSwarm = true) {
  await core.ready()
  if (shouldSwarm) swarm.join(core.discoveryKey)
  if (!core.writable) {
    await swarm.flush()
    await core.update()
  }
}

export async function getBee (key: string) {
  let bee = bees.get(key)
  if (!bee) {
    const core = await getCore(key)
    bee = new Hyperbee(core, {
      keyEncoding: 'utf8',
      valueEncoding: 'json'
    })
    await bee.ready()
    bees.set(key, bee)
  }
  return bee
}

export async function getDbByType (key: string) {
  if (bees.has(key)) return bees.get(key)
  const core = await getCore(key)
  const headerBlock = await core.get(0)
  try {
    const beeHeader = HyperbeeMessages.Header.decode(headerBlock)
    if (beeHeader.protocol === 'hyperbee') {
      return getBee(key)
    }
  } catch (e) {
    // ignore
  }
  return core
}

export function beeSubByPath (bee: Hyperbee, pathParts: string[]): Hyperbee {
  for (let i = 0; i < pathParts.length; i++) {
    bee = bee?.sub(pathParts[i])
  }
  return bee
}

export async function beeList (bee: Hyperbee, pathParts: string[], opts: any): Promise<any> {
  const stream = beeSubByPath(bee, pathParts)?.createReadStream(opts)
  return await new Promise((resolve, reject) => {
    pump(
      stream,
      concat(resolve),
      (err: any) => {
        if (err) reject(err)
      }
    )
  })
}

export function listDbs () {
  return config.dbs || []
}

export function addDbRecord (db: DbRecord) {
  if (!config.dbs || !Array.isArray(config.dbs)) {
    config.dbs = [db]
  } else {
    config.dbs.push(db)
  }
  swarmByRecord(db)
  config._sync()
  return db
}

export function getDbRecord (key: string) {
  if (config.dbs) {
    return config.dbs.find((db: DbRecord) => db.key === key)
  }
}

export function updateDbRecord (db: DbRecord) {
  if (config.dbs) {
    const record = config.dbs.find((db: DbRecord) => db.key === db.key)
    Object.assign(record, db)
    swarmByRecord(record)
    config._sync()
  }
}

export function removeDbRecord (key: string) {
  if (config.dbs && Array.isArray(config.dbs)) {
    config.dbs = config.dbs.filter((db2: {key: string}) => db2.key !== key)
    config._sync()
  }
}

function swarmByRecord (db: DbRecord) {
  const core = cores.get(db.key)
  if (core) {
    if (db?.access === 'private') {
      swarm.leave(core.discoveryKey)
    } else {
      swarm.join(core.discoveryKey)
    }
  }
}