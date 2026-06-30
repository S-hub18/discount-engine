import eventBus from './eventBus'
import { applyCartOffer, calculateDiscounts, type CartItem, type DiscountRule, type PricedCart } from '../engine/applyCartOffer'

type Listener = () => void

export type CartIssue = {
  rowNumber: number
  row: unknown
  reason: string
}

type CartSource = 'csv' | 'pdf' | null
type RuleSource = 'csv' | 'nl' | null

type CartSnapshot = {
  rules: DiscountRule[]
  ruleErrors: string[]
  ruleFileName: string
  ruleSource: RuleSource
  cartItems: CartItem[]
  cartIssues: CartIssue[]
  cartFileName: string
  cartSource: CartSource
  pricedCart: PricedCart
  cartOfferNudge: string | null
}

function formatScope(rule: DiscountRule, capitalize = true) {
  const scope = rule.scope === 'brand' ? 'brand' : rule.scope === 'platform' ? 'platform' : 'cart'
  return capitalize ? scope.charAt(0).toUpperCase() + scope.slice(1) : scope
}

function formatOffer(rule: DiscountRule, capitalizeScope = true) {
  const value = rule.type === 'percentage' ? `${rule.value}% off` : `Rs.${Math.round(rule.value)}`
  return `${formatScope(rule, capitalizeScope)} offer (${value})`
}

function calculateRuleSaving(price: number, rule: DiscountRule) {
  if (rule.type === 'percentage') {
    return Math.round((price * rule.value) / 100)
  }

  return Math.round(rule.value)
}

function enhanceReasoning(pricedCart: PricedCart, rules: DiscountRule[]): PricedCart {
  const rulesById = new Map(rules.map((rule) => [rule.ruleId, rule]))

  return {
    ...pricedCart,
    pricedItems: pricedCart.pricedItems.map((item) => {
      const appliedRules = (item.appliedRules ?? [])
        .map((ruleId) => rulesById.get(ruleId))
        .filter((rule): rule is DiscountRule => Boolean(rule))
      const skippedRules = (item.skippedRules ?? [])
        .map((ruleId) => rulesById.get(ruleId))
        .filter((rule): rule is DiscountRule => Boolean(rule))
      const nonStackableApplied = appliedRules.find((rule) => !rule.stackable)
      const stackableApplied = appliedRules.filter((rule) => rule.stackable)

      if (!nonStackableApplied && stackableApplied.length === 0) {
        return {
          ...item,
          reasoning: 'No offers available for this item.',
        }
      }

      const parts: string[] = []

      if (nonStackableApplied) {
        const skippedNonStackable = skippedRules.filter((rule) => !rule.stackable)
        const bestSkipped = skippedNonStackable.sort(
          (left, right) => calculateRuleSaving(item.basePrice, right) - calculateRuleSaving(item.basePrice, left)
        )[0]

        if (bestSkipped) {
          parts.push(
            `${formatOffer(nonStackableApplied)} saved more than the ${formatOffer(bestSkipped, false)} — applied`
          )
        } else {
          parts.push(`${formatOffer(nonStackableApplied)} applied`)
        }
      }

      for (const rule of stackableApplied) {
        parts.push(`Stackable ${formatOffer(rule, false)} applied`)
      }

      return {
        ...item,
        reasoning: `${parts.join('. ')}.`,
      }
    }),
  }
}

function formatMoney(value: number) {
  return `Rs.${value.toLocaleString('en-IN')}`
}

function buildCartOfferNudge(total: number, rules: DiscountRule[]) {
  const upcomingCartRules = rules
    .filter(
      (rule): rule is DiscountRule =>
        rule.scope === 'cart' &&
        typeof rule.minCartValue === 'number' &&
        Number.isFinite(rule.minCartValue) &&
        rule.minCartValue > total
    )
    .sort((left, right) => (left.minCartValue ?? 0) - (right.minCartValue ?? 0))

  if (upcomingCartRules.length === 0) {
    return null
  }

  const nextRule = upcomingCartRules[0]
  const remaining = Math.max(0, Math.ceil((nextRule.minCartValue ?? 0) - total))
  const offerLabel = nextRule.label ?? (nextRule.type === 'percentage' ? `${nextRule.value}% off` : `Rs.${Math.round(nextRule.value)} off`)

  return `${formatMoney(remaining)} away from an extra ${offerLabel} your order`
}

function createPricedCart(items: CartItem[], rules: DiscountRule[]): { pricedCart: PricedCart; cartOfferNudge: string | null } {
  const pricedCart = enhanceReasoning(applyCartOffer(calculateDiscounts(items, rules), rules), rules)
  const cartOfferNudge = pricedCart.cartOffer ? null : buildCartOfferNudge(pricedCart.itemTotalBeforeCartOffer, rules)

  return {
    pricedCart,
    cartOfferNudge,
  }
}

function normalizeIssue(row: unknown, reason: string): CartIssue {
  if (row && typeof row === 'object' && 'rowNumber' in row && 'row' in row) {
    const candidate = row as { rowNumber: number; row: unknown }
    return {
      rowNumber: candidate.rowNumber,
      row: candidate.row,
      reason,
    }
  }

  return {
    rowNumber: 0,
    row,
    reason,
  }
}

class CartStore {
  private state: CartSnapshot = {
    rules: [],
    ruleErrors: [],
    ruleFileName: '',
    ruleSource: null,
    cartItems: [],
    cartIssues: [],
    cartFileName: '',
    cartSource: null,
    pricedCart: createPricedCart([], []).pricedCart,
    cartOfferNudge: null,
  }

  private pendingCartIssues: CartIssue[] = []
  private listeners: Set<Listener> = new Set()

  constructor() {
    eventBus.on('RuleAdded', ({ rule }) => {
      this.state = {
        ...this.state,
        rules: [...this.state.rules, rule],
        ruleSource: 'nl',
      }
      this.recompute()
      this.emit()
    })

    eventBus.on('RowRejected', ({ row, reason }) => {
      this.pendingCartIssues = [...this.pendingCartIssues, normalizeIssue(row, reason)]
    })

    eventBus.on('RuleRejected', ({ reason }) => {
      this.state = {
        ...this.state,
        ruleErrors: [...this.state.ruleErrors, reason],
      }
      this.emit()
    })

    eventBus.on('CartReplaced', ({ items }) => {
      this.state = {
        ...this.state,
        cartItems: [...items],
        cartIssues: [...this.pendingCartIssues],
        cartSource: 'pdf',
      }
      this.pendingCartIssues = []
      this.recompute()
      this.emit()
    })
  }

  private recompute() {
    const nextPricing = createPricedCart(this.state.cartItems, this.state.rules)

    this.state = {
      ...this.state,
      pricedCart: nextPricing.pricedCart,
      cartOfferNudge: nextPricing.cartOfferNudge,
    }
  }

  private emit() {
    for (const listener of Array.from(this.listeners)) {
      listener()
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot() {
    return this.state
  }

  replaceRules(rules: DiscountRule[], errors: string[] = [], fileName = '', source: RuleSource = 'csv') {
    this.state = {
      ...this.state,
      rules: [...rules],
      ruleErrors: [...errors],
      ruleFileName: fileName,
      ruleSource: source,
    }
    this.recompute()
    this.emit()
  }

  replaceCart(items: CartItem[], issues: CartIssue[] = [], fileName = '', source: CartSource = 'csv') {
    this.pendingCartIssues = []
    this.state = {
      ...this.state,
      cartItems: [...items],
      cartIssues: [...issues],
      cartFileName: fileName,
      cartSource: source,
    }
    this.recompute()
    this.emit()
  }
}

const store = new CartStore()

export default store