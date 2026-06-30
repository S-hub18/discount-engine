import React, { useState } from 'react'
import extractAgent from '../adapters/nl/extractRuleAgent'
import { validateExtraction } from '../adapters/nl/validateRuleAgent'
import { makeClarifyingQuestion } from '../adapters/nl/clarifyRuleAgent'
import eventBus from '../state/eventBus'

export default function NLRuleParser() {
  const [text, setText] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [validation, setValidation] = useState(null)
  const [message, setMessage] = useState('')

  async function handleParse() {
    const input = text.trim()
    if (!input) {
      setMessage('Enter a rule sentence before parsing.')
      setExtraction(null)
      setValidation(null)
      return
    }

    setMessage('Parsing...')
    try {
      const ex = await extractAgent.extractRule(input)
      setExtraction(ex)
      const valid = validateExtraction(ex)
      setValidation(valid)
      if (!valid.valid) {
        const q = makeClarifyingQuestion(valid.reason)
        setMessage(q)
      } else {
        setMessage('Parsed successfully — review details below.')
      }
    } catch (error) {
      setExtraction(null)
      setValidation(null)
      setMessage(error instanceof Error ? `Parsing failed: ${error.message}` : 'Parsing failed. Please try again.')
    }
  }

  function handleConfirm() {
    if (validation && validation.valid) {
      eventBus.emit({ type: 'RuleAdded', rule: validation.rule })
      setMessage('Rule confirmed and emitted as RuleAdded event.')
      setText('')
      setExtraction(null)
      setValidation(null)
    }
  }

  function handleDiscard() {
    setText('')
    setExtraction(null)
    setValidation(null)
    setMessage('Discarded')
  }

  return (
    <div style={{padding:12}}>
      <h3>Natural-language rule parser</h3>
      <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={4} style={{width:'100%'}} />
      <div style={{marginTop:8}}>
        <button onClick={handleParse}>Parse</button>
        <button onClick={handleConfirm} disabled={!validation || !validation.valid} style={{marginLeft:8}}>Confirm</button>
        <button onClick={handleDiscard} style={{marginLeft:8}}>Discard</button>
      </div>

      {message && <p style={{marginTop:8}}>{message}</p>}

      {extraction && (
        <div style={{marginTop:12,border:'1px solid #ddd',padding:8}}>
          <strong>Parsed fields</strong>
          <dl>
            <dt>Scope</dt><dd>{extraction.scope ?? '—'}</dd>
            <dt>Applies to</dt><dd>{extraction.appliesTo ?? '—'}</dd>
            <dt>Type</dt><dd>{extraction.type ?? '—'}</dd>
            <dt>Value</dt><dd>{extraction.value ?? '—'}</dd>
            <dt>Stackable</dt><dd>{extraction.stackable == null ? '—' : extraction.stackable ? 'Yes' : 'No'}</dd>
            <dt>Min cart value</dt><dd>{extraction.minCartValue ?? '—'}</dd>
            <dt>Confidence</dt><dd>{extraction.confidence}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}
