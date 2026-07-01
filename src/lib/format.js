/** Indian-rupee money formatting used across the storefront. */
export function money(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

/** Human label for a discount rule's value, e.g. "15% off" / "₹150 off". */
export function ruleValueLabel(rule) {
  if (rule.label) return rule.label
  return rule.type === 'percentage' ? `${rule.value}% off` : `${money(rule.value)} off`
}

/** Short scope descriptor for an offer chip. */
export function ruleScopeLabel(rule) {
  if (rule.scope === 'brand') return rule.appliesTo
  if (rule.scope === 'platform') return rule.appliesTo
  return `carts over ${money(rule.minCartValue ?? 0)}`
}
