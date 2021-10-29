import { Router, Request, Response } from 'express'
import Hyperbee from 'hyperbee'
// @ts-ignore -prf
import crypto from 'hypercore-crypto'
import * as hyper from './hyper.js'
import { toBase32, joinPath } from './util.js'

export const api = Router()

api.get('/dbs', (req: Request, res: Response) => {
  return res.json({dbs: hyper.listDbs()})
})

api.post('/dbs', async (req: Request, res: Response) => {
  try {
    let keyPair
    let core, key
    let type = req.body?.type === 'bee' ? 'bee' : 'core'

    if (req.body?.key) {
      // adding an existing
      key = req.body.key
      const db = await hyper.getDbByType(key)
      type = db instanceof Hyperbee ? 'bee' : 'core'
      core = db.feed || db
    } else {
      // creating a new
      keyPair = crypto.keyPair()
      core = await hyper.createCore(keyPair)
      key = toBase32(core.key)
      if (type === 'bee') {
        await hyper.getBee(key)
      }
    }

    const record = hyper.addDbRecord({
      key,
      secretKey: keyPair?.secretKey ? toBase32(keyPair?.secretKey) : undefined,
      type,
      writable: core.writable,
      alias: req.body?.alias,
      access: req.body?.access || 'public'
    })
    res.status(200).json(record)
  } catch (e: any) {
    console.error('Error while creating a new database')
    console.error(e)
    res.status(500).json({error: true, message: e.message})
  }
})

api.get('/dbs/:key', async (req: Request, res: Response) => {
  try {
    const dbRecord = hyper.getDbRecord(req.params.key)
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
      const db = await hyper.getDbByType(req.params.key)
      const type = db instanceof Hyperbee ? 'bee' : 'core'
      const core = type === 'bee' ? db._feed : db
      res.status(200).json({
        saved: false,
        key: req.params.key,
        type,
        writable: core.writable,
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
    const dbRecord = hyper.getDbRecord(req.params.key)
    if (!dbRecord) return res.status(404).end({error: true, message: 'DB record not found'})

    dbRecord.alias = ('alias' in req.body) ? req.body.alias : dbRecord.alias
    dbRecord.access = ('access' in req.body) ? req.body.access : dbRecord.access
    hyper.updateDbRecord(dbRecord)

    res.status(200).json({
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
  hyper.removeDbRecord(req.params.key)
  res.status(200).json({})
})

// api.get('/core/:key/:seq') TODO
// api.get('/core/:key/:seq') TODO
// api.post('/core/:key') TODO

api.get(/\/bee\/(.*)/i, async (req: Request, res: Response) => {
  try {
    const {key, path} = parsePath(req.params[0])
    const db = await hyper.getDbByType(key)
    if (!(db instanceof Hyperbee)) throw new Error('Not a Hyperbee')

    if (req.query.list) {
      const records = (await hyper.beeList(db, path, req.query)).map((record: any) => {
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
      const record = await hyper.beeSubByPath(db, path.slice(0, -1)).get(path[path.length - 1])
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
    const db = await hyper.getDbByType(key)
    if (!(db instanceof Hyperbee)) throw new Error('Not a Hyperbee')

    await hyper.beeSubByPath(db, path.slice(0, -1)).put(path[path.length - 1], req.body)
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
    const db = await hyper.getDbByType(key)
    if (!(db instanceof Hyperbee)) throw new Error('Not a Hyperbee')

    await hyper.beeSubByPath(db, path.slice(0, -1)).del(path[path.length - 1])
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