type PdfTextItem = {
  str: string
  transform: number[]
}

type PdfTextContent = {
  items: PdfTextItem[]
}

type ParsedRow = {
  rowNumber: number
  row: {
    product: string
    brand: string
    platform: string
    basePrice: string
  }
}

const HEADER_TOKENS = ['product', 'brand', 'platform', 'base price']

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function groupTextItemsByLine(textContent: PdfTextContent) {
  const lines = new Map<number, Array<{ str: string; x: number }>>()

  for (const item of textContent.items) {
    const str = item.str?.trim()
    if (!str) continue
    const x = item.transform?.[4] ?? 0
    const y = Math.round((item.transform?.[5] ?? 0) * 10) / 10
    const line = lines.get(y) ?? []
    line.push({ str, x })
    lines.set(y, line)
  }

  return Array.from(lines.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([y, items]) => ({
      y,
      items: items.sort((a, b) => a.x - b.x),
    }))
}

function inferHeaderColumns(lines: Array<{ items: Array<{ str: string; x: number }> }>) {
  for (const line of lines) {
    const labels = line.items.map((item) => normalizeLabel(item.str))
    const joined = labels.join(' ')
    if (!HEADER_TOKENS.every((token) => joined.includes(token))) {
      continue
    }

    const columns = {
      product: line.items.find((item) => normalizeLabel(item.str) === 'product')?.x,
      brand: line.items.find((item) => normalizeLabel(item.str) === 'brand')?.x,
      platform: line.items.find((item) => normalizeLabel(item.str) === 'platform')?.x,
      basePrice: line.items.find((item) => normalizeLabel(item.str) === 'base price')?.x,
    }

    if (Object.values(columns).every((value) => typeof value === 'number')) {
      return columns as Record<string, number>
    }
  }

  return null
}

function assignToColumn(x: number, columns: Record<string, number>) {
  const ordered = [
    ['product', columns.product],
    ['brand', columns.brand],
    ['platform', columns.platform],
    ['basePrice', columns.basePrice],
  ] as const

  let winner: string = ordered[0][0]
  let smallestDistance = Number.POSITIVE_INFINITY

  for (const [key, columnX] of ordered) {
    const distance = Math.abs(x - columnX)
    if (distance < smallestDistance) {
      smallestDistance = distance
      winner = key
    }
  }

  return winner
}

function buildRow(line: { items: Array<{ str: string; x: number }> }, columns: Record<string, number>) {
  const cells: Record<string, string> = {
    product: '',
    brand: '',
    platform: '',
    basePrice: '',
  }

  for (const item of line.items) {
    const key = assignToColumn(item.x, columns)
    cells[key] = cells[key] ? `${cells[key]} ${item.str}`.trim() : item.str.trim()
  }

  if (!cells.product && !cells.brand && !cells.platform && !cells.basePrice) {
    return null
  }

  return cells
}

export async function extractRowsFromPdfDocument(pdfDocument: { numPages: number; getPage(pageNumber: number): Promise<{ getTextContent(): Promise<PdfTextContent> }> }, onRow: (row: ParsedRow) => void) {
  let columns: Record<string, number> | null = null
  let rowNumber = 0

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const lines = groupTextItemsByLine(textContent)

    if (!columns) {
      columns = inferHeaderColumns(lines)
    }

    if (!columns) {
      continue
    }

    let headerSeen = false
    for (const line of lines) {
      const joined = line.items.map((item) => normalizeLabel(item.str)).join(' ')
      if (!headerSeen) {
        if (HEADER_TOKENS.every((token) => joined.includes(token))) {
          headerSeen = true
        }
        continue
      }

      const row = buildRow(line, columns)
      if (!row) {
        continue
      }

      rowNumber += 1
      onRow({ rowNumber, row })
    }
  }

  return rowNumber
}