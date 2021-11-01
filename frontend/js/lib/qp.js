export function gen (kv, clear = false) {
  var url = (new URL(window.location))
  if (clear) url.search = ''
  for (const k in kv) {
    if (kv[k] || kv[k] === 0) {
      url.searchParams.set(k, kv[k])
    } else {
      url.searchParams.delete(k)
    }
  }
  return url.search
}

export function genFull (kv, clear) {
  var url = (new URL(window.location))
  return url.pathname + gen(kv, clear)
}

export function dropAllBut (...keys) {
  var url = (new URL(window.location))
  for (const k in url.searchParams) {
    if (!keys.includes(k)) {
      url.searchParams.delete(k)
    }
  }
  return url.search
}

export function has (k) {
  return (new URL(window.location)).searchParams.has(k)
}

export function get (k, fallback) {
  return (new URL(window.location)).searchParams.get(k) || fallback
}