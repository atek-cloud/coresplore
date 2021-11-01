export async function http (method, path, body, contentType = undefined) {
  const headers = {
    Accept: 'application/json',
  }
  if (body) {
    if (contentType) {
      headers['Content-Type'] = contentType
    } else {
      headers['Content-Type'] = 'application/json'
      if (typeof body !== 'string') body = JSON.stringify(body)
    }
  }
  const res = await fetch(path, {
    method,
    headers,
    body
  })
  const resbody = await res.json()
  if (resbody.error) throw resbody.message || 'API call failed'
  return resbody
}