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
import { toBase32, fromBase32 } from './util.js'

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
      writable: core.writable,
      alias,
      access
    })
    await struct._initCore(access !== 'private')
    if (type === 'bee') {
      await struct._initBee()
    }
    structs.set(toBase32(core.key), core)
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
        valueEncoding: 'json'
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

function assertValidType (v: string) {
  if (v !== 'core' && v !== 'bee') {
    throw new Error('Type must be "core" or "bee"')
  }
}