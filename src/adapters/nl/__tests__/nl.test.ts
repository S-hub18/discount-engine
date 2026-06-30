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
      } else {
        expect(validation.valid).toBe(false)
        expect(typeof (validation as any).reason).toBe('string')
      }
    })
  }
})
