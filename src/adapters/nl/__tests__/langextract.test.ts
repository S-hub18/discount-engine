import { describe, it, expect } from 'vitest'
import { locateSpans } from '../langextract'
import { parseHeuristic } from '../extractRuleAgent'

describe('langextract source grounding', () => {
  it('locates verbatim spans and records character offsets', () => {
    const text = '20% off for Natura Casa brand'
    const grounding = locateSpans(text, { value: '20%', appliesTo: 'Natura Casa' })

    const value = grounding.find((g) => g.field === 'value')
    const appliesTo = grounding.find((g) => g.field === 'appliesTo')

    expect(value).toEqual({ field: 'value', sourceText: '20%', startChar: 0, endChar: 3 })
    expect(appliesTo?.startChar).toBe(text.indexOf('Natura Casa'))
    expect(text.slice(appliesTo!.startChar, appliesTo!.endChar)).toBe('Natura Casa')
  })

  it('never invents a span that is not in the source text', () => {
    const grounding = locateSpans('flat Rs.100 off', { appliesTo: 'Flipkart' })
    expect(grounding).toHaveLength(0)
  })

  it('the offline parser grounds the fields it extracts', () => {
    const result = parseHeuristic('Rs.100 flat discount on all Flipkart items')
    expect(result.source).toBe('heuristic')

    const fields = (result.grounding ?? []).map((g) => g.field)
    expect(fields).toContain('appliesTo')
    expect(fields).toContain('value')

    const appliesTo = result.grounding?.find((g) => g.field === 'appliesTo')
    expect(appliesTo?.sourceText.toLowerCase()).toBe('flipkart')
  })
})
