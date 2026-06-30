import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
import { extractRowsFromPdfDocument } from './parsePdfTable'

GlobalWorkerOptions.workerSrc = workerSrc

type ExtractPdfRequest = {
  type: 'ExtractPdf'
  file: File
}

type WorkerRowMessage = {
  type: 'RowExtracted'
  rowNumber: number
  row: {
    product: string
    brand: string
    platform: string
    basePrice: string
  }
}

type WorkerCompleteMessage = {
  type: 'ExtractionComplete'
  rowCount: number
}

type WorkerErrorMessage = {
  type: 'ExtractionError'
  reason: string
}

const workerScope = self as DedicatedWorkerGlobalScope

workerScope.onmessage = async (event: MessageEvent<ExtractPdfRequest>) => {
  const message = event.data
  if (!message || message.type !== 'ExtractPdf') {
    return
  }

  try {
    const bytes = await message.file.arrayBuffer()
    const loadingTask = getDocument({ data: new Uint8Array(bytes) })
    const pdfDocument = await loadingTask.promise

    const rowCount = await extractRowsFromPdfDocument(pdfDocument, (row) => {
      const payload: WorkerRowMessage = {
        type: 'RowExtracted',
        rowNumber: row.rowNumber,
        row: row.row,
      }

      workerScope.postMessage(payload)
    })

    const payload: WorkerCompleteMessage = {
      type: 'ExtractionComplete',
      rowCount,
    }
    workerScope.postMessage(payload)
  } catch (error) {
    const payload: WorkerErrorMessage = {
      type: 'ExtractionError',
      reason: error instanceof Error ? error.message : 'Failed to parse PDF cart',
    }
    workerScope.postMessage(payload)
  }
}

export {}