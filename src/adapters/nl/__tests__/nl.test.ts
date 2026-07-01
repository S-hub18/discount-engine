import { describe, it, expect } from 'vitest'
import { extractRule as extract } from '../extractRuleAgent'
import { validateExtraction as validate } from '../validateRuleAgent'

const examples = [
  {
    text: '20% off for Natura Casa brand, stackable with other offers',
    expectValid: true,
  },
  {
    text: 'Rs.100 flat discount on all Flipkart items',
    expectValid: true,
  },
  {
    text: '10% off if cart value is more than Rs.5,000',
    expectValid: true,
  },
  {
    text: '15% off on Amazon India items, stackable',
    expectValid: true,
  },
  {
    text: 'Give a discount for big orders',
    expectValid: false,
  },
  // Robustness: phrasings the old parser could not handle.
  {
    text: '10 percent off on Flipkart',
    expectValid: true,
    expect: { scope: 'platform', appliesTo: 'Flipkart', type: 'percentage', value: 10 },
  },
  {
    text: 'Flat 150 off for Nordic Basics',
    expectValid: true,
    expect: { scope: 'brand', appliesTo: 'Nordic Basics', type: 'flat', value: 150 },
  },
  {
    text: 'Spend over 3000 and get 12% off',
    expectValid: true,
    expect: { scope: 'cart', type: 'percentage', value: 12, minCartValue: 3000 },
  },
  {
    text: '20% off on orders above Rs.5,000',
    expectValid: true,
    expect: { scope: 'cart', type: 'percentage', value: 20, minCartValue: 5000 },
  },
  {
    text: '25% off Natura Casa products, stackable',
    expectValid: true,
    expect: { scope: 'brand', appliesTo: 'Natura Casa', type: 'percentage', value: 25, stackable: true },
  },
  {
    text: 'Rs 200 off everything on Myntra',
    expectValid: true,
    expect: { scope: 'platform', appliesTo: 'Myntra', type: 'flat', value: 200 },
  },
  {
    text: '69% off on all moaksh products non stacking',
    expectValid: true,
    expect: { scope: 'brand', appliesTo: 'Moaksh', type: 'percentage', value: 69, stackable: false },
  },
  {
    text: '15% off on Flipkart, not stackable',
    expectValid: true,
    expect: { scope: 'platform', appliesTo: 'Flipkart', type: 'percentage', value: 15, stackable: false },
  },
]

describe('NL adapter examples', () => {
  for (const ex of examples) {
    it(`parses: ${ex.text}`, async () => {
      const parsed = await extract(ex.text)
      const validation = validate(parsed)

      // Print result for visibility when running tests
      // eslint-disable-next-line no-console
      console.log('INPUT:', ex.text)
      // eslint-disable-next-line no-console
      console.log('PARSED:', parsed)
      // eslint-disable-next-line no-console
      console.log('VALIDATION:', validation)

      if (ex.expectValid) {
        expect(validation.valid).toBe(true)
        // If valid also satisfy type-specific constraints
        expect(validation).toHaveProperty('rule')

        // When the example pins specific fields, assert the parse matched them.
        if ((ex as any).expect) {
          const rule = (validation as any).rule
          for (const [key, want] of Object.entries((ex as any).expect)) {
            expect(rule[key]).toBe(want)
          }
        }
      } else {
        expect(validation.valid).toBe(false)
        expect(typeof (validation as any).reason).toBe('string')
      }
    })
  }
})
