export function makeClarifyingQuestion(reason: string): string {
  // Map common validation reasons to short, specific follow-ups
  if (reason.startsWith('confidence_unresolvable')) {
    return 'I could not understand the rule. Could you restate the discount with specifics (scope, type, value)?'
  }

  if (reason.startsWith('missing_scope')) {
    return 'Does this discount apply to a brand, a platform (like Flipkart), or the whole cart?'
  }

  if (reason.startsWith('cart_requires_minCartValue')) {
    return 'For a cart-level discount, what is the minimum cart value (in Rs.) required to apply it?'
  }

  if (reason.startsWith('cart_forbids_appliesTo')) {
    return 'This sounds like a cart-level rule — please remove any "applies to" target and provide a min cart value instead.'
  }

  if (reason.startsWith('missing_appliesTo')) {
    return 'Which brand or platform does this discount apply to? (e.g., Natura Casa, Flipkart)'
  }

  if (reason.startsWith('missing_type')) {
    return 'Is this a percentage discount (e.g., 20%) or a flat amount (e.g., Rs.100)?'
  }

  if (reason.startsWith('invalid_percentage_value')) {
    return 'Please provide a percentage between 0 (exclusive) and 100 (inclusive).'
  }

  if (reason.startsWith('invalid_flat_value')) {
    return 'Please provide a positive flat amount in Rs. (e.g., Rs.100).'
  }

  // Generic fallback
  return `Please clarify: ${reason}`
}

export default { makeClarifyingQuestion }
