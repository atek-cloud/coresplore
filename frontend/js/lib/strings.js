export const HYPER_KEY = /([0-9a-f]{64})/i

export function toKeyStr (str) {
  const matches = HYPER_KEY.exec(str)
  return matches ? matches[1] : undefined
}

export function ucfirst (str) {
  if (!str) str = ''
  if (typeof str !== 'string') str = '' + str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function pluralize (num, base, suffix = 's') {
  if (num === 1) { return base }
  return base + suffix
}

export function shorten (str, n = 6) {
  if (str.length > (n + 3)) {
    return str.slice(0, n) + '...'
  }
  return str
}

export function shortenHash (str, n = 6) {
  return `${str.slice(0, 6)}..${str.slice(-2)}`
}

export function joinPath (...args) {
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

export function encodeBase64 (str = '') {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => (
    String.fromCharCode('0x' + p1)
  )))
}

export function decodeBase64 (str = '') {
  return decodeURIComponent(atob(str).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))
}

export function base64ByteSize (str = '') {
  return ((4 * str.length / 3) + 3) & ~3
}

const MAKE_SAFE_MAP = {
  '"': '&quot;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;'
}
export function makeSafe (str = '') {
  return str.replace(/["'&<>]/g, (match) => MAKE_SAFE_MAP[match] || '')
}