import React, { useState } from 'react'
import extractAgent from '../adapters/nl/extractRuleAgent'
import { validateExtraction } from '../adapters/nl/validateRuleAgent'
import { makeClarifyingQuestion } from '../adapters/nl/clarifyRuleAgent'
import eventBus from '../state/eventBus'

const EXAMPLES = [
  '20% off everything from Natura Casa',
  '₹200 off all Flipkart orders, stackable',
  '10% off carts over ₹5000',
]

export default function NLRuleParser() {
  const [text, setText] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [validation, setValidation] = useState(null)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('muted') // muted | ok | warn | err
  const [busy, setBusy] = useState(false)

  async function handleParse() {
    const input = text.trim()
    if (!input) {
      setMessage('Enter a rule sentence before parsing.')
      setTone('warn')
      setExtraction(null)
      setValidation(null)
      return
    }

    setBusy(true)
    setMessage('Parsing…')
    setTone('muted')
    try {
      const ex = await extractAgent.extractRule(input)
      setExtraction(ex)
      const valid = validateExtraction(ex)
      setValidation(valid)
      if (!valid.valid) {
        setMessage(makeClarifyingQuestion(valid.reason))
        setTone('warn')
      } else {
        setMessage('Parsed — review and confirm to apply live.')
        setTone('ok')
      }
    } catch (error) {
      setExtraction(null)
      setValidation(null)
      setMessage(error instanceof Error ? `Parsing failed: ${error.message}` : 'Parsing failed. Please try again.')
      setTone('err')
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm() {
    if (validation && validation.valid) {
      eventBus.emit({ type: 'RuleAdded', rule: validation.rule })
      setMessage('Offer applied — prices updated across the store.')
      setTone('ok')
      setText('')
      setExtraction(null)
      setValidation(null)
    }
  }

  function handleDiscard() {
    setText('')
    setExtraction(null)
    setValidation(null)
    setMessage('')
    setTone('muted')
  }

  const toneColor = { muted: '#646464', ok: '#2b9a66', warn: '#8a5600', err: '#c0392b' }[tone]

  return (
    <div>
      <label className="field-label" htmlFor="nl-rule">Describe an offer in plain English</label>
      <textarea
        id="nl-rule"
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. 15% off all Amazon India items"
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="badge badge--tag" style={{ cursor: 'pointer' }} onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn btn--dark btn--sm" onClick={handleParse} disabled={busy}>
          {busy ? 'Parsing…' : 'Parse'}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleConfirm} disabled={!validation || !validation.valid}>
          Apply offer
        </button>
        {(extraction || text) && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleDiscard}>Clear</button>
        )}
      </div>

      {message && (
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, fontWeight: 600, color: toneColor }}>{message}</p>
      )}

      {extraction && (
        <div className="card card--bone" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Parsed fields</strong>
            {extraction.source && (
              <span className="badge badge--tag">via {extraction.source === 'heuristic' ? 'offline parser' : extraction.source}</span>
            )}
            {extraction.confidence != null && (
              <span className="badge badge--tag" style={{ marginLeft: 'auto' }}>confidence {extraction.confidence}</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Scope', 'scope', extraction.scope],
              ['Applies to', 'appliesTo', extraction.appliesTo],
              ['Type', 'type', extraction.type],
              ['Value', 'value', extraction.value],
              ['Stackable', 'stackable', extraction.stackable == null ? null : extraction.stackable ? 'Yes' : 'No'],
              ['Min cart value', 'minCartValue', extraction.minCartValue],
            ].map(([label, field, display]) => {
              const span = (extraction.grounding ?? []).find((g) => g.field === field)
              return (
                <div key={field}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8d8d8d' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#202020' }}>
                    {display ?? '—'}
                    {span && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#2b9a66', fontWeight: 500 }}>← “{span.sourceText}”</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
