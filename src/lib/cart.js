/**
 * cart.js — view-model helpers that adapt the engine output for the storefront UI.
 */

import { applyDiscounts } from '../engine/discountEngine.js'

/**
 * Prices a single catalog unit against the active rules (item-level offers only;
 * cart-wide threshold offers are applied at the cart level, not per product).
 */
export function priceUnit(product, rules) {
  return applyDiscounts(
    {
      itemId: product.id,
      product: product.product,
      brand: product.brand,
      platform: product.platform,
      basePrice: product.basePrice,
    },
    rules,
  )
}

/**
 * Groups flat cart items into display lines (one per product) with quantity and
 * aggregated pricing, reading per-unit results from the engine's priced cart.
 */
export function groupCartLines(snapshot) {
  const pricedById = new Map(
    snapshot.pricedCart.pricedItems.map((p) => [p.itemId, p]),
  )
  const order = []
  const map = new Map()

  for (const item of snapshot.cartItems) {
    const key = item.productId || item.itemId
    if (!map.has(key)) {
      map.set(key, {
        key,
        productId: item.productId || null,
        product: item.product,
        brand: item.brand,
        platform: item.platform,
        basePrice: item.basePrice,
        qty: 0,
        lineBase: 0,
        lineFinal: 0,
        lineSave: 0,
        unitFinal: item.basePrice,
        reasoning: '',
      })
      order.push(key)
    }
    const line = map.get(key)
    const priced = pricedById.get(item.itemId)
    const final = priced ? priced.finalPrice : item.basePrice
    line.qty += 1
    line.lineBase += item.basePrice
    line.lineFinal += final
    line.lineSave += item.basePrice - final
    line.unitFinal = final
    if (priced && priced.reasoning && priced.reasoning !== 'No offers available') {
      line.reasoning = priced.reasoning
    }
  }

  return order.map((k) => map.get(k))
}

/** Quantity-in-cart per productId, for catalog steppers. */
export function quantityByProduct(snapshot) {
  const counts = {}
  for (const item of snapshot.cartItems) {
    if (!item.productId) continue
    counts[item.productId] = (counts[item.productId] || 0) + 1
  }
  return counts
}
