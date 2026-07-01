/**
 * langextract.ts
 *
 * A small, dependency-light TypeScript port of the *method* behind
 * Google's `langextract` (https://github.com/google/langextract).
 *
 * langextract itself is a Python-only library, so it can't run in a
 * static, client-side React app without dragging a Python backend (or a
 * heavy Pyodide/WASM runtime) into the deploy. The assignment explicitly
 * favours keeping this client-side, so instead of shipping the library we
 * reimplement its contract — which is the part that actually matters:
 *
 *   1. prompt description  — what to pull out, in plain words
 *   2. few-shot examples   — input text paired with the structured result
 *   3. schema-constrained  — the model must return JSON matching a schema
 *   4. source grounding    — every extracted field is tied back to the
 *                            exact phrase in the input that produced it
 *
 * (1)–(3) make extraction reliable; (4) is langextract's signature
 * feature and is what lets the UI show "value 20% ← from '20%'".
 *
 * This module is generic and rule-agnostic. The discount-rule specifics
 * (examples, schema, prompt) live in extractRuleAgent.ts.
 */

import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'

/** A single field grounded back to its source span in the input text. */
export interface Grounding {
  field: string
  sourceText: string
  startChar: number
  endChar: number
}

/** One few-shot example: an input sentence and the structured object it maps to. */
export interface Example<T> {
  text: string
  /** The structured result a perfect extractor would return for `text`. */
  extraction: T
  /** field → the verbatim phrase in `text` that justifies that field. */
  spans?: Partial<Record<keyof T & string, string>>
}

export interface ExtractConfig<T> {
  /** The text to extract from. */
  text: string
  /** Plain-language description of the extraction task. */
  promptDescription: string
  /** Few-shot examples that anchor the output shape and edge cases. */
  examples: Example<T>[]
  /** Zod schema the model output must satisfy (the contract). */
  schema: z.ZodType<T>
  /** Gemini API key. If absent, extract() throws NO_API_KEY so callers can fall back. */
  apiKey?: string
  /** Defaults to gemini-1.5-flash. */
  modelName?: string
  /** Hard ceiling on the model call. Defaults to 10s. */
  timeoutMs?: number
}

export interface ExtractResult<T> {
  data: T
  grounding: Grounding[]
  modelUsed: string
}

export const NO_API_KEY = 'NO_API_KEY'

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`langextract timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/**
 * Source grounding, langextract-style: take the verbatim phrases the model
 * claims it used for each field and locate them (case-insensitively) in the
 * original text, recording character offsets. Phrases that can't be found in
 * the source are dropped — grounding never invents a span.
 */
export function locateSpans(
  text: string,
  spans: Record<string, string | null | undefined>
): Grounding[] {
  const haystack = text.toLowerCase()
  const grounding: Grounding[] = []

  for (const [field, raw] of Object.entries(spans)) {
    if (!raw || typeof raw !== 'string') continue
    const needle = raw.trim()
    if (!needle) continue

    const startChar = haystack.indexOf(needle.toLowerCase())
    if (startChar === -1) continue

    grounding.push({
      field,
      sourceText: text.slice(startChar, startChar + needle.length),
      startChar,
      endChar: startChar + needle.length,
    })
  }

  return grounding
}

function buildPrompt<T>(config: ExtractConfig<T>): string {
  const lines: string[] = [
    config.promptDescription.trim(),
    '',
    'Return ONLY a single JSON object. No prose, no code fences.',
    'The JSON must contain the extracted fields PLUS a "spans" object that maps',
    'each non-null field name to the exact, verbatim phrase from the input text',
    'that justifies it (this is used for source grounding — copy it character for',
    'character; if a field was inferred and has no supporting phrase, omit it from spans).',
    'If a field cannot be determined, set it to null. Do not guess.',
    '',
    'Examples:',
  ]

  for (const example of config.examples) {
    const output = { ...example.extraction, spans: example.spans ?? {} }
    lines.push(`Input: ${JSON.stringify(example.text)}`)
    lines.push(`Output: ${JSON.stringify(output)}`)
    lines.push('')
  }

  lines.push(`Input: ${JSON.stringify(config.text)}`)
  lines.push('Output:')

  return lines.join('\n')
}

/**
 * Run an extraction. Mirrors `langextract.extract(...)`: text + prompt +
 * examples + schema in, a schema-validated object with source grounding out.
 *
 * Throws Error(NO_API_KEY) when no key is configured so the caller can fall
 * back to a deterministic parser without treating it as a real failure.
 */
export async function extract<T>(config: ExtractConfig<T>): Promise<ExtractResult<T>> {
  if (!config.apiKey) {
    throw new Error(NO_API_KEY)
  }

  const modelName = config.modelName ?? 'gemini-1.5-flash'
  const client = new GoogleGenerativeAI(config.apiKey)
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = buildPrompt(config)
  const result = await withTimeout(model.generateContent(prompt), config.timeoutMs ?? 10000)
  const raw = JSON.parse(stripCodeFences(result.response.text())) as Record<string, unknown>

  const { spans, ...fields } = raw
  const data = config.schema.parse(fields)

  const grounding = locateSpans(
    config.text,
    (spans && typeof spans === 'object' ? spans : {}) as Record<string, string>
  )

  return { data, grounding, modelUsed: modelName }
}

export default { extract, locateSpans, NO_API_KEY }
