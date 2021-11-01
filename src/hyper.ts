// @ts-ignore -prf
import crypto from 'hypercore-crypto'
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
import * as config from './config.js'
import lock from './lock.js'
import { toBase32, fromBase32, joinPath } from './util.js'

let store: Corestore
let swarm: Hyperswarm
const structs: Map<string, any> = new Map()

export class HyperStruct {
  bee?: Hyperbee
  constructor (public core: any, public record: config.DbRecord) {
  }

  static isLoaded (key: string) {
    return structs.has(key)
  }

  static getCached (key: string) {
    return structs.get(key)
  }

  static async create ({type, alias, access}: {type: string, alias: string, access: string}) {
    assertValidType(type)
    const keyPair = crypto.keyPair()
    const core = store.get(keyPair)
    const struct = new HyperStruct(core, {
      key: toBase32(keyPair.publicKey),
      secretKey: toBase32(keyPair?.secretKey),
      type,
      writable: true,
      alias,
      access
    })
    await struct._initCore(access !== 'private')
    if (type === 'bee') {
      await struct._initBee()
    }
    structs.set(toBase32(core.key), struct)
    return struct
  }

  static async get (key: string) {
    const release = await lock(`hyper-struct:get:${key}`)
    try {
      let struct = structs.get(key)
      if (!struct) {
        let dbRecord = config.getDbRecord(key)

        const core = (dbRecord && dbRecord.secretKey) ? (
          store.get({publicKey: fromBase32(key), secretKey: fromBase32(dbRecord.secretKey)})
        ) : (
          store.get(fromBase32(key))
        )

        struct = new HyperStruct(core, dbRecord)
        await struct._initCore(dbRecord?.access !== 'private')

        if (!dbRecord) {
          dbRecord = {
            key,
            type: await struct._detectType(),
            writable: struct.core.writable
          }
        }

        if (dbRecord.type === 'bee') {
          await struct._initBee()
        }

        structs.set(key, struct)
      }
      return struct
    } finally {
      release()
    }
  }

  saveToCoresplore () {
    config.addDbRecord(this.record)
  }

  unsaveFromCoresplore () {
    config.removeDbRecord(this.record.key)
  }

  updateRecord (updates: any) {
    Object.assign(this.record, updates)
    config.updateDbRecord(this.record)
    if (this.record.access === 'private') {
      swarm.leave(this.core.discoveryKey)
    } else {
      swarm.join(this.core.discoveryKey)
    }
  }

  async _initCore (shouldSwarm: boolean) {
    await this.core.ready()
    if (shouldSwarm) swarm.join(this.core.discoveryKey)
    if (!this.core.writable) {
      await swarm.flush()
      await this.core.update()
    }
  }

  async _initBee () {
    if (!this.bee) {
      this.bee = new Hyperbee(this.core, {
        keyEncoding: 'utf8',
        valueEncoding: 'binary'
      })
      await this.bee.ready()
    }
  }

  async _detectType () {
    const headerBlock = await this.core.get(0)
    try {
      const beeHeader = HyperbeeMessages.Header.decode(headerBlock)
      if (beeHeader.protocol === 'hyperbee') {
        return 'bee'
      }
    } catch (e) {
      // ignore
    }
    return 'core'
  }
}

export function setup (opts: {storagePath: string}) {
  store = new Corestore(opts.storagePath)
  swarm = new Hyperswarm()
  swarm.on('connection', (connection: any) => store.replicate(connection))
}

export async function coreGet (core: any, seq: number, opts: any): Promise<any> {
  const encoding = isValidValueEncoding(opts.encoding) ? opts.encoding : 'utf-8'
  const timeout = !Number.isNaN(Number(opts.timeout)) ? Number(opts.timeout) : 0
  let value
  if (encoding === 'hyperbee') {
    const block = await core.get(seq, {valueEncoding: 'binary', timeout})
    if (seq === 0) {
      value = HyperbeeMessages.Header.decode(block)
    } else {
      value = HyperbeeMessages.Node.decode(block)
      value.index = HyperbeeMessages.YoloIndex.decode(value.index)
      value.key = value.key.toString('utf-8')
      value.value = value.value?.toString('utf-8')
    }
    value = value || block
  } else if (encoding === 'binary') {
    value = (await core.get(seq, {valueEncoding: 'binary', timeout})).toString('hex')
  } else {
    value = await core.get(seq, {valueEncoding: encoding, timeout})
  }
  return {seq, value}
}

export async function coreList (core: any, opts: any): Promise<any> {
  let start = opts.gt ? (Number(opts.gt) + 1) : opts.gte ? Number(opts.gte) : 0
  if (Number.isNaN(start)) start = 0
  let end = opts.lt ? Number(opts.lt) : opts.lte ? Number(opts.lte + 1) : Infinity
  if (Number.isNaN(end)) end = Infinity
  const encoding = isValidValueEncoding(opts.encoding) ? opts.encoding : 'utf-8'
  const timeout = !Number.isNaN(Number(opts.timeout)) ? Number(opts.timeout) : 0

  await core.update()

  const blocks = []
  const getOpts = {encoding, timeout}
  for (let i = start; i < end && i < core.length; i++) {
    blocks.push(await coreGet(core, i, getOpts))
  }
  
  return blocks
}

export async function coreAppend (core: any, value: any, opts: any): Promise<any> {
  const encoding = isValidValueEncoding(opts.encoding) ? opts.encoding : 'utf-8'
  if (encoding === 'binary') {
    value = Buffer.from(value, 'hex')
  } else if (encoding === 'json' || encoding === 'hyperbee') {
    value = JSON.stringify(value)
    value = Buffer.from(value, 'utf-8')
  } else {
    value = Buffer.from(value, 'utf-8')
  }
  await core.append(value)
  return {seq: core.length - 1}
}

export function beeSubByPath (bee: Hyperbee, pathParts: string[]): Hyperbee {
  for (let i = 0; i < pathParts.length; i++) {
    bee = bee?.sub(pathParts[i])
  }
  return bee
}

export async function beeGet (bee: Hyperbee, path: string[], opts: any): Promise<any> {
  const encoding = isValidValueEncoding(opts.encoding) ? opts.encoding : 'utf-8'
  const rpath = `/${joinPath(...path)}`
  const record = await beeSubByPath(bee, path.slice(0, -1)).get(path[path.length - 1])
  if (record) {
    if (encoding === 'binary') {
      record.value = record.value.toString('hex')
    } else {
      record.value = record.value.toString('utf-8')
    }
    return {
      key: record.key,
      path: rpath,
      seq: record.seq,
      value: record.value
    }
  }
}

export async function beeList (bee: Hyperbee, path: string[], opts: any): Promise<any> {
  const encoding = isValidValueEncoding(opts.encoding) ? opts.encoding : 'utf-8'
  const stream = beeSubByPath(bee, path)?.createReadStream(opts)
  const records: any[] = await new Promise((resolve, reject) => {
    pump(
      stream,
      // @ts-ignore the type sig is wrong
      concat(resolve),
      (err: any) => {
        if (err) reject(err)
      }
    )
  })
  return records.map((record) => {
    if (encoding === 'binary') {
      record.value = record.value.toString('hex')
    } else {
      record.value = record.value.toString('utf-8')
    }
    const keyParts = record.key.split('\x00').filter(Boolean)
    return {
      key: keyParts.join('/'),
      path: `/${joinPath(...path, ...keyParts)}`,
      seq: record.seq,
      value: record.value
    }
  })
}

export async function beePut (bee: Hyperbee, path: string[], value: any, opts: any): Promise<any> {
  const encoding = isValidValueEncoding(opts.encoding) ? opts.encoding : 'utf-8'
  if (encoding === 'binary') {
    value = Buffer.from(value, 'hex')
  } else {
    value = Buffer.from(value, 'utf-8')
  }
  await beeSubByPath(bee, path.slice(0, -1)).put(path[path.length - 1], value)
}

function assertValidType (v: string) {
  if (v !== 'core' && v !== 'bee') {
    throw new Error('Type must be "core" or "bee"')
  }
}

function isValidValueEncoding (v: string): boolean {
  return v === 'hyperbee' || v === 'json' || v === 'utf-8' || v === 'binary'
}