import { downloadBlob } from './dom.js'

export function importFromJson (fileStr) {
  const obj = JSON.parse(fileStr)
  if (obj['@context'] !== 'https://atek.cloud/hyperbee-export') {
    throw new Error('Unable to import file: must be a JSON-LD file with a @context of "https://atek.cloud/hyperbee-export')
  }
  const records = []
  for (const path in obj) {
    if (!path.startsWith('/')) continue
    records.push({path, value: obj[path]})
  }
  return records
}

export function exportAsJson (records) {
  const exportJson = {
    "@context": "https://atek.cloud/hyperbee-export"
  }
  for (const record of records) {
    exportJson[record.path] = record.value
  }
  const jsonBlob = new Blob([JSON.stringify(exportJson, null, 2)], {type: 'application/json;charset=utf-8'})
  downloadBlob(jsonBlob, 'export.json')
}