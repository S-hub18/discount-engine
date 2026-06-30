import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { parseRulesCSV, parseCartCSV } from '../csvParser.js'
import { calculateDiscounts, applyCartOffer } from '../applyCartOffer.js'

describe('Safety net: sample-data through calculateDiscounts', () => {
  it('returns the expected final prices for each sample item', () => {
    const rulesCsv = fs.readFileSync(path.join(process.cwd(), 'sample-data', 'rules.csv'), 'utf-8')
    const cartCsv = fs.readFileSync(path.join(process.cwd(), 'sample-data', 'cart.csv'), 'utf-8')

    const { data: rules, errors: rErrors } = parseRulesCSV(rulesCsv)
    const { data: cart, errors: cErrors } = parseCartCSV(cartCsv)

    expect(rErrors).toEqual([])
    expect(cErrors).toEqual([])

    const results = calculateDiscounts(cart, rules)

    const byId = Object.fromEntries(results.map((r) => [r.itemId, r]))

    expect(byId['ITEM-01'].finalPrice).toBe(1104)
    expect(byId['ITEM-02'].finalPrice).toBe(629)
    expect(byId['ITEM-03'].finalPrice).toBe(509)
    expect(byId['ITEM-04'].finalPrice).toBe(2499)
    expect(byId['ITEM-04'].reasoning).toBe('No offers available')
    expect(byId['ITEM-05'].finalPrice).toBe(382)
    expect(byId['ITEM-06'].finalPrice).toBe(809)
  })

  it('applies the cart offer at the threshold and hides it below the threshold', () => {
    const rulesCsv = fs.readFileSync(path.join(process.cwd(), 'sample-data', 'rules.csv'), 'utf-8')
    const cartCsv = fs.readFileSync(path.join(process.cwd(), 'sample-data', 'cart.csv'), 'utf-8')

    const { data: rules, errors: rErrors } = parseRulesCSV(rulesCsv)
    const { data: cart, errors: cErrors } = parseCartCSV(cartCsv)

    expect(rErrors).toEqual([])
    expect(cErrors).toEqual([])
    expect(rules.some((rule) => rule.scope === 'cart')).toBe(true)

    const sampleCartRule = rules.find((rule) => rule.scope === 'cart')
    expect(sampleCartRule).toMatchObject({
      ruleId: 'RULE-04',
      scope: 'cart',
      type: 'percentage',
      value: 10,
      minCartValue: 5932,
      label: '10% off',
    })

    const pricedItems = calculateDiscounts(cart, rules)
    const cartOfferRule = {
      ruleId: 'CART-10',
      scope: 'cart',
      type: 'percentage',
      value: 10,
      minCartValue: 5932,
      label: '10% off',
    }

    const exactThreshold = applyCartOffer(pricedItems, [cartOfferRule])
    expect(exactThreshold.itemTotalBeforeCartOffer).toBe(5932)
    expect(exactThreshold.cartOffer).toEqual({
      ruleId: 'CART-10',
      amountSaved: 593,
      label: '10% off',
    })
    expect(exactThreshold.finalCartTotal).toBe(5339)

    const oneRupeeBelow = applyCartOffer(
      pricedItems.map((item, index) =>
        index === 0 ? { ...item, finalPrice: item.finalPrice - 1 } : item
      ),
      [cartOfferRule]
    )

    expect(oneRupeeBelow.itemTotalBeforeCartOffer).toBe(5931)
    expect(oneRupeeBelow.cartOffer).toBeNull()
    expect(oneRupeeBelow.finalCartTotal).toBe(5931)
  })
})
