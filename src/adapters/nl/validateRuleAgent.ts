import { DiscountRule } from '../../engine/applyCartOffer'
import { ExtractionResult } from './extractRuleAgent'

type ValidResult = { valid: true; rule: DiscountRule }
type InvalidResult = { valid: false; reason: string }

export function validateExtraction(ex: ExtractionResult): ValidResult | InvalidResult {
  if (ex.confidence === 'unresolvable') {
    return { valid: false, reason: 'confidence_unresolvable: the extractor could not determine required fields' }
  }

  if (!ex.scope) {
    return { valid: false, reason: 'missing_scope: could not determine whether this applies to cart, brand or platform' }
  }

  if (ex.scope === 'cart') {
    if (typeof ex.minCartValue !== 'number' || !Number.isFinite(ex.minCartValue)) {
      return { valid: false, reason: 'cart_requires_minCartValue: cart-scoped rules must include a numeric minimum cart value' }
    }

    if (ex.appliesTo) {
      return { valid: false, reason: 'cart_forbids_appliesTo: cart-scoped rules must not specify an appliesTo target' }
    }
  }

  if (ex.scope === 'platform' || ex.scope === 'brand') {
    if (!ex.appliesTo || typeof ex.appliesTo !== 'string' || ex.appliesTo.trim() === '') {
      return { valid: false, reason: 'missing_appliesTo: platform or brand scoped rules require an appliesTo value (e.g., Flipkart or Natura Casa)' }
    }
  }

  if (!ex.type) {
    return { valid: false, reason: 'missing_type: could not determine whether discount is percentage or flat' }
  }

  if (ex.type === 'percentage') {
    if (typeof ex.value !== 'number' || !(ex.value > 0 && ex.value <= 100)) {
      return { valid: false, reason: 'invalid_percentage_value: percentage discounts require a value > 0 and <= 100' }
    }
  }

  if (ex.type === 'flat') {
    if (typeof ex.value !== 'number' || !(ex.value > 0)) {
      return { valid: false, reason: 'invalid_flat_value: flat discounts require a positive numeric value' }
    }
  }

  // Build DiscountRule now that validations passed
  const rule: DiscountRule = {
    ruleId: `nl-${Date.now().toString(36)}`,
    scope: ex.scope,
    appliesTo: ex.appliesTo ?? undefined,
    type: ex.type,
    value: ex.value ?? 0,
    stackable: ex.stackable ?? false,
    minCartValue: ex.minCartValue ?? undefined,
    label: undefined,
  }

  return { valid: true, rule }
}

export default { validateExtraction }
