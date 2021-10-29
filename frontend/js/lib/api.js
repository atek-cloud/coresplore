export async function http (method, path, body) {
  const headers = {
    Accept: 'application/json',
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
    if (typeof body !== 'string') body = JSON.stringify(body)
  }
  const res = await fetch(path, {
    method,
    headers,
    body
  })
  return await res.json()
}