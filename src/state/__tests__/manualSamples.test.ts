import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it } from 'vitest'

const sampleDir = path.join(process.cwd(), 'sample-data', 'manual-tests')

function readSample(name: string) {
  return fs.readFileSync(path.join(sampleDir, name), 'utf-8')
}

describe('manual sample documents', () => {
  beforeEach(async () => {
    const { default: cartStore } = await import('../cartStore')
    cartStore.replaceRules([], [], '', 'csv')
    cartStore.replaceCart([], [], '', 'csv')
  })

  it('covers comparison, stackable, and no-offer reasoning', async () => {
    const { parseRulesCSV, parseCartCSV } = await import('../../engine/csvParser.js')
    const { default: cartStore } = await import('../cartStore')

    const balancedRules = parseRulesCSV(readSample('balanced-rules.csv'))
    const balancedCart = parseCartCSV(readSample('balanced-cart.csv'))
    expect(balancedRules.errors).toEqual([])
    expect(balancedCart.errors).toEqual([])
    cartStore.replaceRules(balancedRules.data, [], 'balanced-rules.csv', 'csv')
    cartStore.replaceCart(balancedCart.data, [], 'balanced-cart.csv', 'csv')
    let snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].reasoning).toBe(
      'Platform offer (20% off) saved more than the brand offer (10% off) — applied.'
    )

    const stackableRules = parseRulesCSV(readSample('stackable-rules.csv'))
    const stackableCart = parseCartCSV(readSample('stackable-cart.csv'))
    expect(stackableRules.errors).toEqual([])
    expect(stackableCart.errors).toEqual([])
    cartStore.replaceRules(stackableRules.data, [], 'stackable-rules.csv', 'csv')
    cartStore.replaceCart(stackableCart.data, [], 'stackable-cart.csv', 'csv')
    snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].reasoning).toBe(
      'Brand offer (Rs.150) applied. Stackable platform offer (10% off) applied.'
    )

    const noOffersRules = parseRulesCSV(readSample('no-offers-rules.csv'))
    const noOffersCart = parseCartCSV(readSample('no-offers-cart.csv'))
    expect(noOffersRules.errors).toEqual([])
    expect(noOffersCart.errors).toEqual([])
    cartStore.replaceRules(noOffersRules.data, [], 'no-offers-rules.csv', 'csv')
    cartStore.replaceCart(noOffersCart.data, [], 'no-offers-cart.csv', 'csv')
    snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].reasoning).toBe('No offers available for this item.')
  })

  it('covers cart thresholds below and at the threshold', async () => {
    const { parseRulesCSV, parseCartCSV } = await import('../../engine/csvParser.js')
    const { default: cartStore } = await import('../cartStore')

    const thresholdRules = parseRulesCSV(readSample('threshold-rules.csv'))
    const belowCart = parseCartCSV(readSample('threshold-cart-below.csv'))
    const exactCart = parseCartCSV(readSample('threshold-cart-exact.csv'))
    expect(thresholdRules.errors).toEqual([])
    expect(belowCart.errors).toEqual([])
    expect(exactCart.errors).toEqual([])

    cartStore.replaceRules(thresholdRules.data, [], 'threshold-rules.csv', 'csv')
    cartStore.replaceCart(belowCart.data, [], 'threshold-cart-below.csv', 'csv')
    let snapshot = cartStore.getSnapshot()
    expect(snapshot.cartOfferNudge).toBe('Rs.200 away from an extra 15% off your order')
    expect(snapshot.pricedCart.cartOffer).toBeNull()

    cartStore.replaceCart(exactCart.data, [], 'threshold-cart-exact.csv', 'csv')
    snapshot = cartStore.getSnapshot()
    expect(snapshot.cartOfferNudge).toBeNull()
    expect(snapshot.pricedCart.cartOffer).toEqual({
      ruleId: 'THRESH-RULE-01',
      amountSaved: 300,
      label: '15% off',
    })
  })
})