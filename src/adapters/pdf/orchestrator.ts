import eventBus from '../../state/eventBus'
import { normalizeCartRow } from './normalizeCartRows'

type CartIssue = {
  rowNumber: number
  row: unknown
  reason: string
}

type CartItem = {
  itemId: string
  product: string
  brand: string
  platform: string
  basePrice: number
}

type WorkerMessage =
  | { type: 'RowExtracted'; rowNumber: number; row: { product?: string; brand?: string; platform?: string; basePrice?: string } }
  | { type: 'ExtractionComplete'; rowCount: number }
  | { type: 'ExtractionError'; reason: string }

type CartExtractionResult = {
  items: Array<{
    itemId: string
    product: string
    brand: string
    platform: string
    basePrice: number
  }>
  issues: CartIssue[]
  rowCount: number
}

export async function extractPdfCart(file: File): Promise<CartExtractionResult> {
  return new Promise<CartExtractionResult>((resolve, reject) => {
    const worker = new Worker(new URL('./extractWorker.ts', import.meta.url), { type: 'module' })
    const items: CartExtractionResult['items'] = []
    const issues: CartIssue[] = []

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data

      if (message.type === 'RowExtracted') {
        const normalized = normalizeCartRow(message.row, message.rowNumber)

        if ('valid' in normalized && normalized.valid === false) {
          const issue: CartIssue = {
            rowNumber: message.rowNumber,
            row: normalized.row,
            reason: normalized.reason,
          }
          issues.push(issue)
          eventBus.emit({
            type: 'RowRejected',
            row: { rowNumber: message.rowNumber, row: normalized.row },
            reason: normalized.reason,
          })
          return
        }

        items.push(normalized)
        return
      }

      if (message.type === 'ExtractionComplete') {
        eventBus.emit({ type: 'CartReplaced', items })
        worker.terminate()
        resolve({ items, issues, rowCount: message.rowCount })
        return
      }

      if (message.type === 'ExtractionError') {
        worker.terminate()
        reject(new Error(message.reason))
      }
    }

    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }

    worker.postMessage({ type: 'ExtractPdf', file })
  })
}