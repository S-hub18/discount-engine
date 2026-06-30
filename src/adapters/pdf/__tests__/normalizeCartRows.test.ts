import { describe, it, expect } from 'vitest'
import { normalizeCartRow } from '../normalizeCartRows'

describe('normalizeCartRow', () => {
  it('returns a CartItem for a valid row', () => {
    const result = normalizeCartRow(
      {
        itemId: 'ITEM-01',
        product: 'Cushion Cover',
        brand: 'Natura Casa',
        platform: 'Amazon India',
        basePrice: '1299',
      },
      1
    )

    expect(result).toEqual({
      itemId: 'ITEM-01',
      product: 'Cushion Cover',
      brand: 'Natura Casa',
      platform: 'Amazon India',
      basePrice: 1299,
    })
  })

  it('flags a missing base price without throwing', () => {
    const result = normalizeCartRow(
      {
        itemId: 'ITEM-03',
        product: 'Wall Shelf',
        brand: 'LivSpace Pro',
        platform: 'Amazon India',
        basePrice: '',
      },
      3
    )

    expect(result).toEqual({
      valid: false,
      row: {
        itemId: 'ITEM-03',
        product: 'Wall Shelf',
        brand: 'LivSpace Pro',
        platform: 'Amazon India',
        basePrice: '',
      },
      reason: 'Base Price must parse as a positive number.',
    })
  })
})