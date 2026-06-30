import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'
import { describe, it, expect } from 'vitest'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extractRowsFromPdfDocument } from '../parsePdfTable'
import { normalizeCartRow } from '../normalizeCartRows'

const require = createRequire(import.meta.url)
const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs')
).href

async function extractRowsFromFile(fileName: string) {
  const bytes = fs.readFileSync(path.join(process.cwd(), 'sample-data', fileName))
  const loadingTask = getDocument({ data: new Uint8Array(bytes) })
  const pdf = await loadingTask.promise
  const rows: Array<{ rowNumber: number; row: Record<string, unknown> }> = []
  const count = await extractRowsFromPdfDocument(pdf, (row) => rows.push(row))
  return { count, rows }
}

describe('PDF cart extraction', () => {
  it('streams all six clean sample rows', async () => {
    const { count, rows } = await extractRowsFromFile('cart.pdf')

    expect(count).toBe(6)
    expect(rows).toHaveLength(6)

    const normalized = rows.map((entry) => normalizeCartRow(entry.row, entry.rowNumber))
    expect(normalized.every((row) => 'valid' in row ? row.valid === false : true)).toBe(true)
    expect(normalized).toContainEqual({
      itemId: 'ITEM-01',
      product: 'Cushion Cover',
      brand: 'Natura Casa',
      platform: 'Amazon India',
      basePrice: 1299,
    })
  })

  it('flags one corrupted row while keeping the other five valid', async () => {
    const { count, rows } = await extractRowsFromFile('cart-corrupt.pdf')

    expect(count).toBe(6)
    expect(rows).toHaveLength(6)

    const normalized = rows.map((entry) => normalizeCartRow(entry.row, entry.rowNumber))
    const validRows = normalized.filter((row): row is Exclude<typeof row, { valid: false }> => !('valid' in row))
    const invalidRows = normalized.filter((row) => 'valid' in row && row.valid === false)

    expect(validRows).toHaveLength(5)
    expect(invalidRows).toHaveLength(1)
    expect(invalidRows[0]).toMatchObject({
      reason: 'Base Price must parse as a positive number.',
    })
  })
})