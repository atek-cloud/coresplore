import { Router, Request, Response } from 'express'
import Hyperbee from 'hyperbee'
import * as hyper from './hyper.js'
import * as config from './config.js'
import { joinPath } from './util.js'

export const api = Router()

api.get('/dbs', (req: Request, res: Response) => {
  return res.json({dbs: config.listDbs()})
})

api.post('/dbs', async (req: Request, res: Response) => {
  try {
    let struct
    if (req.body?.key) {
      struct = await hyper.HyperStruct.get(req.body.key)
      if ('alias' in req.body) struct.record.alias = req.body.alias
      if ('access' in req.body) struct.record.access = req.body.access
    } else {
      struct = await hyper.HyperStruct.create(req.body)
    }
    await struct.saveToCoresplore()
    res.status(200).json(struct.record)
  } catch (e: any) {
    console.error('Error while creating a new database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.get('/dbs/:key', async (req: Request, res: Response) => {
  try {
    const dbRecord = config.getDbRecord(req.params.key)
    if (dbRecord) {
      res.status(200).json({
        saved: true,
        key: dbRecord.key,
        type: dbRecord.type,
        writable: dbRecord.writable,
        alias: dbRecord.alias,
        access: dbRecord.access
      })
    } else {
      const struct = await hyper.HyperStruct.get(req.body.key)
      res.status(200).json({
        saved: false,
        key: req.params.key,
        type: struct.record.type,
        writable: struct.record.writable,
        access: 'public'
      })
    }
  } catch (e: any) {
    console.error('Error while getting a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.patch('/dbs/:key', (req: Request, res: Response) => {
  try {
    const dbRecord = config.getDbRecord(req.params.key)
    if (!dbRecord) return res.status(404).end({error: true, message: 'DB record not found'})

    dbRecord.alias = ('alias' in req.body) ? req.body.alias : dbRecord.alias
    dbRecord.access = ('access' in req.body) ? req.body.access : dbRecord.access

    if (hyper.HyperStruct.isLoaded(req.params.key)) {
      hyper.HyperStruct.getCached(req.params.key).updateRecord(dbRecord)
    } else {
      config.updateDbRecord(dbRecord)
    }

    res.status(200).json({
      saved: true,
      key: dbRecord.key,
      type: dbRecord.type,
      writable: dbRecord.writable,
      alias: dbRecord.alias,
      access: dbRecord.access
    })
  } catch (e: any) {
    console.error('Error while getting a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.delete('/dbs/:key', (req: Request, res: Response) => {
  // TODO unload and delete struct
  config.removeDbRecord(req.params.key)
  res.status(200).json({})
})

// api.get('/core/:key/:seq') TODO
// api.get('/core/:key/:seq') TODO
// api.post('/core/:key') TODO

api.get(/\/bee\/(.*)/i, async (req: Request, res: Response) => {
  try {
    const {key, path} = parsePath(req.params[0])
    const db = await hyper.HyperStruct.get(key)
    if (db.record.type !== 'bee') throw new Error('Not a Hyperbee')

    if (req.query.list) {
      const records = (await hyper.beeList(db.bee, path, req.query)).map((record: any) => {
        const keyParts = record.key.split('\x00').filter(Boolean)
        return {
          key: keyParts.join('/'),
          path: `/${joinPath(...path, ...keyParts)}`,
          url: `hyper://${joinPath(key, ...path, ...keyParts)}`,
          seq: record.seq,
          value: record.value || {}
        }
      })
      res.status(200).json({records})
    } else {
      const rpath = `/${joinPath(...path)}`
      const record = await hyper.beeSubByPath(db.bee, path.slice(0, -1)).get(path[path.length - 1])
      if (!record) return res.status(404).end()
      res.status(200).json({
        key: record.key,
        path: rpath,
        url: `hyper://${joinPath(key, rpath)}`,
        seq: record.seq,
        value: record.value || {}
      })
    }
  } catch (e: any) {
    console.error('Error while reading a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.put(/\/bee\/(.*)/i, async (req: Request, res: Response) => {
  try {
    const {key, path} = parsePath(req.params[0])
    const db = await hyper.HyperStruct.get(key)
    if (db.record.type !== 'bee') throw new Error('Not a Hyperbee')

    await hyper.beeSubByPath(db.bee, path.slice(0, -1)).put(path[path.length - 1], req.body)
    res.status(200).json({
      key: path[path.length - 1],
      path: `/${joinPath(...path)}`,
      url: `hyper://${joinPath(key, ...path)}`,
      seq: undefined, // TODO needed?
      value: req.body
    })
  } catch (e: any) {
    console.error('Error while updating a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.delete(/\/bee\/(.*)/i, async (req: Request, res: Response) => {
  try {
    const {key, path} = parsePath(req.params[0])
    const db = await hyper.HyperStruct.get(key)
    if (db.record.type !== 'bee') throw new Error('Not a Hyperbee')

    await hyper.beeSubByPath(db.bee, path.slice(0, -1)).del(path[path.length - 1])
    res.status(200).json({})
  } catch (e: any) {
    console.error('Error while updating a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

function parsePath (path: string): {key: string, path: string[]} {
  const pathParts = path.split('/').filter(Boolean)
  return {
    key: pathParts[0],
    path: pathParts.slice(1)
  }
}