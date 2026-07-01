/**
 * extractRuleAgent.ts
 *
 * Turns a plain-English discount rule into a structured ExtractionResult.
 *
 * The extraction uses our langextract-style engine (see ./langextract.ts):
 * a prompt + few-shot examples + a Zod schema + source grounding, run
 * against Gemini. When no API key is configured (or the call fails) we fall
 * back to a deterministic regex parser so the app — and its tests — work
 * with zero external dependencies.
 *
 * The discount-rule *specifics* (examples, schema, prompt) live here; the
 * generic extraction mechanics live in langextract.ts. That keeps "how we
 * call an LLM" separate from "what a discount rule looks like".
 */

import { z } from 'zod'
import { extract, locateSpans, NO_API_KEY, type Example, type Grounding } from './langextract'

// ── Schema & types ───────────────────────────────────────────────

export const ExtractionSchema = z.object({
  scope: z.union([z.literal('platform'), z.literal('brand'), z.literal('cart')]).nullable(),
  appliesTo: z.string().nullable(),
  type: z.union([z.literal('percentage'), z.literal('flat')]).nullable(),
  value: z.number().nullable(),
  stackable: z.boolean().nullable(),
  minCartValue: z.number().nullable(),
  confidence: z.union([z.literal('complete'), z.literal('partial'), z.literal('unresolvable')]),
})

type ExtractionFields = z.infer<typeof ExtractionSchema>

export type ExtractionResult = ExtractionFields & {
  /** Which input phrase produced each field (langextract source grounding). */
  grounding?: Grounding[]
  /** 'gemini-...' when the LLM was used, 'heuristic' for the offline fallback. */
  source?: string
}

// ── langextract configuration: prompt + few-shot examples ────────

const PROMPT_DESCRIPTION = [
  'You extract a single discount rule from a short sentence written by a',
  'marketplace operator. Map it to these fields:',
  '- scope: "platform" (e.g. Amazon India, Flipkart), "brand" (e.g. Natura Casa),',
  '  or "cart" (a whole-order threshold offer). null if unclear.',
  '- appliesTo: the platform or brand name. null for cart-scoped or unclear rules.',
  '- type: "percentage" or "flat" (a fixed rupee amount). null if unclear.',
  '- value: the number (15 for "15%", 100 for "Rs.100"). null if unclear.',
  '- stackable: true if the text says it stacks/combines with other offers;',
  '  false if it says non-stackable / not stackable / does not stack / no stacking;',
  '  null only when the text is silent about stacking.',
  '- minCartValue: for cart rules, the minimum cart total in rupees. null otherwise.',
  '- confidence: "complete" if every required field is present, "partial" if some',
  '  are present, "unresolvable" if the text gives no usable discount.',
].join('\n')

const RULE_EXAMPLES: Example<ExtractionFields>[] = [
  {
    text: '20% off for Natura Casa brand, stackable with other offers',
    extraction: {
      scope: 'brand',
      appliesTo: 'Natura Casa',
      type: 'percentage',
      value: 20,
      stackable: true,
      minCartValue: null,
      confidence: 'complete',
    },
    spans: { scope: 'Natura Casa brand', appliesTo: 'Natura Casa', value: '20%', stackable: 'stackable' },
  },
  {
    text: 'Rs.100 flat discount on all Flipkart items',
    extraction: {
      scope: 'platform',
      appliesTo: 'Flipkart',
      type: 'flat',
      value: 100,
      stackable: null,
      minCartValue: null,
      confidence: 'complete',
    },
    spans: { appliesTo: 'Flipkart', type: 'flat', value: 'Rs.100' },
  },
  {
    text: '10% off if cart value is more than Rs.5,000',
    extraction: {
      scope: 'cart',
      appliesTo: null,
      type: 'percentage',
      value: 10,
      stackable: null,
      minCartValue: 5000,
      confidence: 'complete',
    },
    spans: { scope: 'cart value', value: '10%', minCartValue: 'Rs.5,000' },
  },
  {
    text: 'Flat 150 off for Nordic Basics',
    extraction: {
      scope: 'brand',
      appliesTo: 'Nordic Basics',
      type: 'flat',
      value: 150,
      stackable: null,
      minCartValue: null,
      confidence: 'complete',
    },
    spans: { appliesTo: 'Nordic Basics', type: 'flat', value: '150' },
  },
  {
    text: 'Spend over 3000 and get 12 percent off',
    extraction: {
      scope: 'cart',
      appliesTo: null,
      type: 'percentage',
      value: 12,
      stackable: null,
      minCartValue: 3000,
      confidence: 'complete',
    },
    spans: { scope: 'Spend', value: '12 percent', minCartValue: 'over 3000' },
  },
  {
    text: 'Give a discount for big orders',
    extraction: {
      scope: null,
      appliesTo: null,
      type: null,
      value: null,
      stackable: null,
      minCartValue: null,
      confidence: 'unresolvable',
    },
    spans: {},
  },
]

// ── Runtime env access (works under Node and Vite) ───────────────

function getRuntimeEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name]
  }

  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env
    return env[name] ?? env[`VITE_${name}`]
  }

  return undefined
}

function resolveApiKey(): string | undefined {
  return (
    getRuntimeEnv('GEMINI_API_KEY') ||
    getRuntimeEnv('GOOGLE_API_KEY') ||
    getRuntimeEnv('GOOGLE_GEMINI_API_KEY')
  )
}

// ── Public API ───────────────────────────────────────────────────

const EMPTY_UNRESOLVABLE: ExtractionResult = {
  scope: null,
  appliesTo: null,
  type: null,
  value: null,
  stackable: null,
  minCartValue: null,
  confidence: 'unresolvable',
}

/**
 * Extract a discount rule from text.
 *
 * Strategy: if a Gemini key is configured, use the langextract engine
 * (few-shot + schema + grounding). Otherwise — or if that call fails for
 * any reason — fall back to the deterministic heuristic parser. The caller
 * always gets a valid ExtractionResult; it never throws on a missing key.
 */
export async function extractRule(text: string): Promise<ExtractionResult> {
  const sourceText = typeof text === 'string' ? text.trim() : ''
  if (!sourceText) {
    return EMPTY_UNRESOLVABLE
  }

  // Allow explicitly forcing the offline parser (e.g. deterministic tests).
  const forceHeuristic = getRuntimeEnv('NL_USE_LLM') === 'false'
  const apiKey = forceHeuristic ? undefined : resolveApiKey()

  try {
    const { data, grounding, modelUsed } = await extract<ExtractionFields>({
      text: sourceText,
      promptDescription: PROMPT_DESCRIPTION,
      examples: RULE_EXAMPLES,
      schema: ExtractionSchema,
      apiKey,
      modelName: getRuntimeEnv('NL_MODEL'),
    })

    return { ...data, grounding, source: modelUsed }
  } catch (error) {
    // NO_API_KEY is an expected, silent fallback. Anything else, we still
    // degrade gracefully to the heuristic rather than failing the parse.
    void (error instanceof Error && error.message === NO_API_KEY)
    return parseHeuristic(sourceText)
  }
}

// ── Deterministic fallback parser ────────────────────────────────

const KNOWN_PLATFORMS: Array<{ match: string; label: string }> = [
  { match: 'amazon india', label: 'Amazon India' },
  { match: 'amazon', label: 'Amazon' },
  { match: 'flipkart', label: 'Flipkart' },
  { match: 'myntra', label: 'Myntra' },
  { match: 'meesho', label: 'Meesho' },
  { match: 'ajio', label: 'Ajio' },
  { match: 'nykaa', label: 'Nykaa' },
  { match: 'noon', label: 'Noon' },
]

const CART_WORDS = /\b(cart|order|orders|basket|spend|spending|purchase|purchases|bill|total)\b/i

function ground(text: string, spans: Record<string, string | null | undefined>): Grounding[] {
  return locateSpans(text, spans)
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ')
}

function toNumber(raw: string): number {
  return Number(raw.replace(/[,\s]/g, ''))
}

const LEADING_CONNECTORS = /^(?:on|off|for|across|all|the|of|get|at|a|an)\s+/i

/** Strip connector words a greedy lead-in may have pulled into a brand capture. */
function cleanLabel(raw: string): string {
  let s = raw.trim()
  while (LEADING_CONNECTORS.test(s)) s = s.replace(LEADING_CONNECTORS, '')
  return s.trim()
}

type Detected<T> = { value: T; raw: string } | null

/** Percentage: "20%", "20 %", "20 percent", "20 per cent", "20pct". */
function detectPercentage(text: string): Detected<number> {
  // %: no trailing \b (it sits between two non-word chars and would never match).
  // Word forms (percent / per cent / pct): require \b so "pctx" doesn't match.
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:%|(?:per\s?cent|percent|pct)\b)/i)
  return m ? { value: Number(m[1]), raw: m[0] } : null
}

/**
 * Flat amount: currency-prefixed ("Rs.100", "₹100", "INR 100"),
 * currency-suffixed ("100 rupees"), "flat 100", "100 off", or "off 100".
 * Only called when no percentage is present, so a bare number is the discount.
 */
function detectFlat(text: string): Detected<number> {
  const patterns = [
    /(?:rs\.?|inr|₹)\s*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:rupees?|rs\b|inr|₹)/i,
    /flat\s+(?:rs\.?\s*)?(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:rs\.?\s*)?off\b/i,
    /(?:off|discount\s+of)\s+(?:rs\.?\s*)?(\d[\d,]*)/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m) return { value: toNumber(m[1]), raw: m[0] }
  }
  return null
}

/**
 * Cart threshold: "more than 5000", "above Rs.5,000", "over 4000",
 * "at least 3000", "minimum order of 5000", "spend 5000", "5000 or more".
 */
function detectThreshold(text: string): Detected<number> {
  const patterns = [
    /(?:more than|greater than|above|over|at\s*least|min(?:imum)?(?:\s+(?:order|cart|purchase|spend))?(?:\s+(?:value|total))?(?:\s+of)?|≥|>=|=>|>)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,]*)/i,
    /(?:spend(?:ing)?|cart\s+(?:value|total)|order\s+(?:value|total)|bill)\s+(?:of\s+|is\s+)?(?:rs\.?|inr|₹)?\s*(\d[\d,]*)/i,
    /(?:rs\.?|inr|₹)?\s*(\d[\d,]*)\s*(?:or more|and above|or above|\+)/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m) return { value: toNumber(m[1]), raw: m[0] }
  }
  return null
}

/**
 * Stackable, with explicit negation handling. Negatives are checked first so
 * "non stackable" / "doesn't stack" resolve to false rather than matching the
 * positive "stack" substring. Returns null only when the text is silent on it.
 */
function detectStackable(text: string): Detected<boolean> {
  const negative = text.match(
    /\b(?:non[-\s]?stack(?:able|ing)?|not\s+stack(?:able|ing)?|no\s+stack(?:ing|able)?|do(?:es)?\s*n['’]?t\s+stack|cannot\s+stack|can['’]?t\s+stack|not\s+combinable|cannot\s+be\s+combined|can['’]?t\s+be\s+combined)\b/i
  )
  if (negative) return { value: false, raw: negative[0] }

  const positive = text.match(/stackable|stacks?\b|combine[sd]?\s+with|on top of/i)
  if (positive) return { value: true, raw: positive[0] }

  return null
}

type Target = { scope: 'platform' | 'brand'; label: string; phrase: string } | null

/** Strict target: a known platform, or a phrase that explicitly says "brand"/"products". */
function detectTarget(text: string): Target {
  const lower = text.toLowerCase()

  const platform = KNOWN_PLATFORMS.find((p) => lower.includes(p.match))
  if (platform) {
    const idx = lower.indexOf(platform.match)
    return { scope: 'platform', label: platform.label, phrase: text.slice(idx, idx + platform.match.length) }
  }

  const brandPatterns = [
    /\bfor\s+([A-Za-z][A-Za-z0-9 ]*?)\s+brand\b/i,
    /\b([A-Za-z][A-Za-z0-9 ]*?)\s+brand\b/i,
    /\bbrand\s+([A-Za-z][A-Za-z0-9 ]+?)\b/i,
    /(?:on|for|across|off)\s+(?:all\s+)?([A-Za-z][A-Za-z0-9 ]*?)\s+(?:items?|products?|range|collection|catalogue)\b/i,
  ]
  for (const pattern of brandPatterns) {
    const m = text.match(pattern)
    const label = cleanLabel(m?.[1] ?? '')
    if (label && !CART_WORDS.test(label) && !/^(the|all|big|small|large|every)$/i.test(label)) {
      return { scope: 'brand', label: titleCase(label), phrase: label }
    }
  }

  return null
}

/**
 * Weak fallback: a "for/on <X>" target with no "brand"/"products" keyword.
 * Used only when there is no threshold and no cart language, so the most
 * likely reading is a brand the user named directly.
 */
function detectGenericBrand(text: string): { label: string; phrase: string } | null {
  const m = text.match(
    /\b(?:for|on|across|off)\s+(?:(?:everything|anything)\s+)?(?:all\s+)?(?:from\s+)?([A-Za-z][A-Za-z0-9'’]*(?:\s+[A-Za-z][A-Za-z0-9'’]*){0,2})/i
  )
  const label = cleanLabel(m?.[1] ?? '')
  if (!label) return null
  if (CART_WORDS.test(label) || /\b(items?|products?|everything|stuff)\b/i.test(label)) return null
  if (/^(the|all|big|small|large|every)$/i.test(label)) return null
  return { label: titleCase(label), phrase: label }
}

export function parseHeuristic(text: string): ExtractionResult {
  const stackable = detectStackable(text)
  const percentage = detectPercentage(text)
  const flat = percentage ? null : detectFlat(text)
  const threshold = detectThreshold(text)
  const target = detectTarget(text)

  const type: 'percentage' | 'flat' | null = percentage ? 'percentage' : flat ? 'flat' : null
  const amount = percentage ?? flat
  const value = amount ? amount.value : null

  // No discount amount at all → nothing usable; let the validator clarify.
  if (value == null || !amount) {
    return { ...EMPTY_UNRESOLVABLE, source: 'heuristic', grounding: [] }
  }

  const stackableSpan = stackable ? { stackable: stackable.raw } : {}
  const baseSpans = { value: amount.raw, ...stackableSpan }

  // Scope decision:
  //  1. A threshold with no explicit brand/platform target → cart rule.
  //  2. An explicit brand/platform target wins.
  //  3. A bare "for/on <X>" with no threshold/cart language → likely a brand.
  //  4. Otherwise scope is unknown → partial, so a clarifying question fires.

  if (threshold && !target) {
    return {
      scope: 'cart',
      appliesTo: null,
      type,
      value,
      stackable: stackable ? stackable.value : null,
      minCartValue: threshold.value,
      confidence: 'complete',
      source: 'heuristic',
      grounding: ground(text, { ...baseSpans, minCartValue: threshold.raw }),
    }
  }

  if (target) {
    return {
      scope: target.scope,
      appliesTo: target.label,
      type,
      value,
      stackable: stackable ? stackable.value : null,
      minCartValue: null,
      confidence: 'complete',
      source: 'heuristic',
      grounding: ground(text, { ...baseSpans, appliesTo: target.phrase }),
    }
  }

  const genericBrand = threshold ? null : detectGenericBrand(text)
  if (genericBrand) {
    return {
      scope: 'brand',
      appliesTo: genericBrand.label,
      type,
      value,
      stackable: stackable ? stackable.value : null,
      minCartValue: null,
      confidence: 'complete',
      source: 'heuristic',
      grounding: ground(text, { ...baseSpans, appliesTo: genericBrand.phrase }),
    }
  }

  return {
    scope: null,
    appliesTo: null,
    type,
    value,
    stackable: stackable ? stackable.value : null,
    minCartValue: threshold ? threshold.value : null,
    confidence: 'partial',
    source: 'heuristic',
    grounding: ground(text, { ...baseSpans, minCartValue: threshold?.raw ?? null }),
  }
}

export default { extractRule, parseHeuristic }
