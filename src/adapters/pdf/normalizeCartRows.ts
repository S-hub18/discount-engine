export type CartRowInput = {
  itemId?: unknown
  product?: unknown
  brand?: unknown
  platform?: unknown
  basePrice?: unknown
}

export type CartItem = {
  itemId: string
  product: string
  brand: string
  platform: string
  basePrice: number
}

export type InvalidCartRow = {
  valid: false
  row: unknown
  reason: string
}

export type NormalizedCartRow = CartItem | InvalidCartRow

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readPositiveNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  return null
}

export function normalizeCartRow(row: CartRowInput, rowNumber: number): NormalizedCartRow {
  const product = readText(row?.product)
  if (!product) {
    return { valid: false, row, reason: 'Product must be a non-empty string.' }
  }

  const brand = readText(row?.brand)
  if (!brand) {
    return { valid: false, row, reason: 'Brand must be a non-empty string.' }
  }

  const platform = readText(row?.platform)
  if (!platform) {
    return { valid: false, row, reason: 'Platform must be a non-empty string.' }
  }

  const basePrice = readPositiveNumber(row?.basePrice)
  if (basePrice == null) {
    return { valid: false, row, reason: 'Base Price must parse as a positive number.' }
  }

  const itemId = readText(row?.itemId) || `ITEM-${String(rowNumber).padStart(2, '0')}`

  return {
    itemId,
    product,
    brand,
    platform,
    basePrice: Math.round(basePrice),
  }
}