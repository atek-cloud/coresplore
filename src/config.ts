import path from 'path'
import { jsonSyncer } from './util.js'

let config: any

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
}

export function listDbs () {
  return config.dbs || []
}

export function addDbRecord (db: DbRecord) {
  if (!config.dbs || !Array.isArray(config.dbs)) {
    config.dbs = [db]
  } else {
    if (!config.dbs.find((db: DbRecord) => db.key === db.key)) {
      config.dbs.push(db)
    } else {
      return updateDbRecord(db)
    }
  }
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
    config._sync()
  }
}

export function removeDbRecord (key: string) {
  if (config.dbs && Array.isArray(config.dbs)) {
    config.dbs = config.dbs.filter((db2: {key: string}) => db2.key !== key)
    config._sync()
  }
}