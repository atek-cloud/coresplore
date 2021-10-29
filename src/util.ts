import fs from 'fs'
import b32 from 'hi-base32'

export function toBase32 (buf: Buffer) {
  return b32.encode(buf).replace(/=/g, '').toLowerCase()
}

export function fromBase32 (str: string) {
  return Buffer.from(b32.decode.asBytes(str.toUpperCase()))
}

export function joinPath (...args: string[]): string {
  var str = args[0]
  for (let v of args.slice(1)) {
    v = v && typeof v === 'string' ? v : ''
    let left = str.endsWith('/')
    let right = v.startsWith('/')
    if (left !== right) str += v
    else if (left) str += v.slice(1)
    else str += '/' + v
  }
  return str
}

export function jsonSyncer (filepath: string) {
  let str
  try {
    str = fs.readFileSync(filepath, 'utf8')
  } catch (e) {
    // ignore, doesn't exist yet
    str = ''
  }
  const state = str ? JSON.parse(str) : {} // throws on parse error
  state._sync = () => fs.writeFileSync(filepath, JSON.stringify(state, null, 2))
  return state
}