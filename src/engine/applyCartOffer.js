import { processCart } from './discountEngine.js'
export { applyCartOffer } from './applyCartOffer.ts'

// Lightweight wrapper to expose the expected calculateDiscounts signature.
// This file does not contain calculation logic — it simply delegates to
// the pure engine in discountEngine.js.
export function calculateDiscounts(cart, rules) {
  return processCart(cart, rules)
}

export default calculateDiscounts
