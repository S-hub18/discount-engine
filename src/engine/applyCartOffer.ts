export interface PricedItem {
  itemId: string
  product: string
  brand: string
  platform: string
  basePrice: number
  finalPrice: number
  totalDiscount?: number
  appliedRules?: string[]
  skippedRules?: string[]
  reasoning?: string
}

export interface DiscountRule {
  ruleId: string
  scope: 'brand' | 'platform' | 'cart'
  appliesTo?: string
  type: 'percentage' | 'flat'
  value: number
  stackable?: boolean
  minCartValue?: number
  label?: string
}

export interface CartOffer {
  ruleId: string
  amountSaved: number
  label: string
}

export interface PricedCart {
  pricedItems: PricedItem[]
  itemTotalBeforeCartOffer: number
  cartOffer: CartOffer | null
  finalCartTotal: number
}

function formatCartOfferLabel(rule: DiscountRule): string {
  if (rule.label) {
    return rule.label
  }

  if (rule.type === 'flat') {
    return `Rs.${Math.round(rule.value)} off`
  }

  return `${rule.value}% off`
}

function calculateCartOfferSaving(total: number, rule: DiscountRule): number {
  if (rule.type === 'flat') {
    return Math.round(rule.value)
  }

  return Math.round((total * rule.value) / 100)
}

export function applyCartOffer(pricedItems: PricedItem[], rules: DiscountRule[]): PricedCart {
  const itemTotalBeforeCartOffer = pricedItems.reduce((sum, item) => sum + item.finalPrice, 0)

  const eligibleCartRules = rules.filter(
    (rule) =>
      rule.scope === 'cart' &&
      typeof rule.minCartValue === 'number' &&
      Number.isFinite(rule.minCartValue) &&
      itemTotalBeforeCartOffer >= rule.minCartValue
  )

  let cartOffer: CartOffer | null = null

  if (eligibleCartRules.length > 0) {
    const bestRule = eligibleCartRules.reduce((winner, rule) => {
      const winnerSaving = calculateCartOfferSaving(itemTotalBeforeCartOffer, winner)
      const ruleSaving = calculateCartOfferSaving(itemTotalBeforeCartOffer, rule)
      return ruleSaving > winnerSaving ? rule : winner
    })

    cartOffer = {
      ruleId: bestRule.ruleId,
      amountSaved: calculateCartOfferSaving(itemTotalBeforeCartOffer, bestRule),
      label: formatCartOfferLabel(bestRule),
    }
  }

  return {
    pricedItems,
    itemTotalBeforeCartOffer,
    cartOffer,
    finalCartTotal: itemTotalBeforeCartOffer - (cartOffer?.amountSaved ?? 0),
  }
}

export default applyCartOffer