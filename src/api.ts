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

api.get('/core/:key', async (req: Request, res: Response) => {
  try {
    const db = await hyper.HyperStruct.get(req.params.key)
    const records = await hyper.coreList(db.core, req.query)
    res.status(200).json({records})
  } catch (e: any) {
    console.error('Error while reading a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.get('/core/:key/:seq', async (req: Request, res: Response) => {
  try {
    const db = await hyper.HyperStruct.get(req.params.key)
    const record = await hyper.coreGet(db.core, Number(req.params.seq) || 0, req.query)
    res.status(200).json(record)
  } catch (e: any) {
    console.error('Error while reading a database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.post('/core/:key', async (req: Request, res: Response) => {
  try {
    const db = await hyper.HyperStruct.get(req.params.key)
    const record = await hyper.coreAppend(db.core, req.body, req.query)
    res.status(200).json(record)
  } catch (e: any) {
    console.error('Error while appending to a hypercore')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.get(/\/bee\/(.*)/i, async (req: Request, res: Response) => {
  try {
    const {key, path} = parsePath(req.params[0])
    const db = await hyper.HyperStruct.get(key)
    if (db.record.type !== 'bee') throw new Error('Not a Hyperbee')

    if (req.query.list) {
      const records = await hyper.beeList(db.bee, path, req.query)
      res.status(200).json({records})
    } else {
      const record = await hyper.beeGet(db.bee, path, req.query)
      if (!record) return res.status(404).end()
      res.status(200).json(record)
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

    await hyper.beePut(db.bee, path, req.body, req.query)
    res.status(200).json({
      key: path[path.length - 1],
      path: `/${joinPath(...path)}`,
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