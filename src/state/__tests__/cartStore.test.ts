import { beforeEach, describe, expect, it } from 'vitest'

describe('cartStore event-driven updates', () => {
  beforeEach(async () => {
    const { default: cartStore } = await import('../cartStore')
    cartStore.replaceRules([], [], '', 'csv')
    cartStore.replaceCart([], [], '', 'csv')
  })

  it('recomputes when a rule is added through the event bus', async () => {
    const [{ default: cartStore }, { default: eventBus }] = await Promise.all([
      import('../cartStore'),
      import('../eventBus'),
    ])

    cartStore.replaceCart(
      [
        {
          itemId: 'item-1',
          product: 'Shirt',
          brand: 'BrandA',
          platform: 'web',
          basePrice: 1000,
        },
      ],
      [],
      'cart.csv',
      'csv'
    )

    eventBus.emit({
      type: 'RuleAdded',
      rule: {
        ruleId: 'rule-1',
        scope: 'brand',
        appliesTo: 'BrandA',
        type: 'percentage',
        value: 10,
        stackable: true,
      },
    })

    const snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].finalPrice).toBe(900)
    expect(snapshot.pricedCart.finalCartTotal).toBe(900)
  })

  it('recomputes when the cart is replaced through the event bus', async () => {
    const [{ default: cartStore }, { default: eventBus }] = await Promise.all([
      import('../cartStore'),
      import('../eventBus'),
    ])

    cartStore.replaceRules(
      [
        {
          ruleId: 'rule-1',
          scope: 'brand',
          appliesTo: 'BrandA',
          type: 'flat',
          value: 100,
          stackable: true,
        },
      ],
      [],
      'rules.csv',
      'csv'
    )

    eventBus.emit({
      type: 'CartReplaced',
      items: [
        {
          itemId: 'item-2',
          product: 'Shoes',
          brand: 'BrandA',
          platform: 'web',
          basePrice: 500,
        },
      ],
    })

    const snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].finalPrice).toBe(400)
    expect(snapshot.pricedCart.finalCartTotal).toBe(400)
  })

  it('keeps reasoning and cart nudges in sync as rules and PDF carts change', async () => {
    const [{ default: cartStore }, { default: eventBus }] = await Promise.all([
      import('../cartStore'),
      import('../eventBus'),
    ])

    cartStore.replaceRules(
      [
        {
          ruleId: 'rule-brand',
          scope: 'brand',
          appliesTo: 'BrandA',
          type: 'percentage',
          value: 10,
          stackable: false,
        },
        {
          ruleId: 'rule-cart',
          scope: 'cart',
          type: 'percentage',
          value: 10,
          minCartValue: 1500,
          label: '10% off',
        },
      ],
      [],
      'rules.csv',
      'csv'
    )

    cartStore.replaceCart(
      [
        {
          itemId: 'item-1',
          product: 'Shirt',
          brand: 'BrandA',
          platform: 'web',
          basePrice: 1000,
        },
      ],
      [],
      'cart.csv',
      'csv'
    )

    let snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].reasoning).toBe('Brand offer (10% off) applied.')
    expect(snapshot.cartOfferNudge).toBe('Rs.600 away from an extra 10% off your order')

    eventBus.emit({
      type: 'RuleAdded',
      rule: {
        ruleId: 'rule-platform',
        scope: 'platform',
        appliesTo: 'web',
        type: 'percentage',
        value: 15,
        stackable: false,
      },
    })

    snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].reasoning).toBe(
      'Platform offer (15% off) saved more than the brand offer (10% off) — applied.'
    )
    expect(snapshot.cartOfferNudge).toBe('Rs.650 away from an extra 10% off your order')

    eventBus.emit({
      type: 'CartReplaced',
      items: [
        {
          itemId: 'item-2',
          product: 'Shoes',
          brand: 'BrandA',
          platform: 'web',
          basePrice: 2000,
        },
      ],
    })

    snapshot = cartStore.getSnapshot()
    expect(snapshot.pricedCart.pricedItems[0].reasoning).toBe(
      'Platform offer (15% off) saved more than the brand offer (10% off) — applied.'
    )
    expect(snapshot.pricedCart.cartOffer).toEqual({
      ruleId: 'rule-cart',
      amountSaved: 170,
      label: '10% off',
    })
    expect(snapshot.cartOfferNudge).toBeNull()
  })
})