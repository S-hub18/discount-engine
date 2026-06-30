/**
 * App.jsx
 *
 * Top-level component. Manages state for rules, cart items, and results.
 * Wires together CSV upload → parse → engine → display.
 */

import { useState, useSyncExternalStore } from 'react'
import CsvUploader from './components/CsvUploader.jsx'
import PdfUploader from './components/PdfUploader.jsx'
import DataTable from './components/DataTable.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import NLRuleParser from './ui/NLRuleParser.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import cartStore from './state/cartStore'
import { extractPdfCart } from './adapters/pdf/orchestrator'

// ── Column definitions ───────────────────────────────────────────

const RULES_COLUMNS = [
  { key: 'ruleId',    label: 'Rule ID' },
  { key: 'scope',     label: 'Scope',      render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies To' },
  { key: 'type',      label: 'Type',       render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  {
    key: 'value',
    label: 'Value',
    render: (v, row) => row.type === 'percentage' ? `${v}% off` : `Rs.${v} off`,
  },
  { key: 'stackable', label: 'Stackable',  render: (v) => (v ? 'Yes' : 'No') },
]

const CART_COLUMNS = [
  { key: 'itemId',    label: 'Item' },
  { key: 'product',   label: 'Product' },
  { key: 'brand',     label: 'Brand' },
  { key: 'platform',  label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
]

const CART_ISSUE_COLUMNS = [
  { key: 'rowNumber', label: 'Row' },
  {
    key: 'product',
    label: 'Product',
    render: (_, row) => row.row?.product ?? '—',
  },
  {
    key: 'brand',
    label: 'Brand',
    render: (_, row) => row.row?.brand ?? '—',
  },
  {
    key: 'platform',
    label: 'Platform',
    render: (_, row) => row.row?.platform ?? '—',
  },
  {
    key: 'basePrice',
    label: 'Base Price',
    render: (_, row) => row.row?.basePrice ?? '—',
  },
  { key: 'reason', label: 'Reason' },
]

const RESULTS_COLUMNS = [
  { key: 'itemId',    label: 'Item' },
  { key: 'product',   label: 'Product' },
  { key: 'basePrice', label: 'Base Price',  render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
  { key: 'finalPrice',label: 'Final Price',
    render: (v, row) => (
      <span style={{ fontWeight: 700, color: row.totalDiscount > 0 ? '#1e5c2c' : '#131A48' }}>
        Rs.{v.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'totalDiscount',
    label: 'You Save',
    render: (v) =>
      v > 0 ? (
        <span style={{ color: '#1e5c2c', fontWeight: 600 }}>Rs.{v.toLocaleString('en-IN')}</span>
      ) : (
        <span style={{ color: '#888' }}>—</span>
      ),
  },
  {
    key: 'reasoning',
    label: 'Offer Applied',
    render: (v) => (
      <span style={{ color: v === 'No offers available' ? '#888' : '#131A48', fontStyle: v === 'No offers available' ? 'italic' : 'normal' }}>
        {v}
      </span>
    ),
  },
]

// ── Styles ───────────────────────────────────────────────────────

const S = {
  page:    { minHeight: '100vh', background: '#f7f7f9', fontFamily: 'Arial, sans-serif' },
  header:  { background: '#131A48', padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoTxt: { fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' },
  logoSpan:{ color: '#FF5800' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  main:    { maxWidth: 960, margin: '0 auto', padding: '1.8rem 1.5rem' },
  section: { background: '#fff', border: '1px solid #CECECE', borderRadius: 6, padding: '1.2rem 1.4rem', marginBottom: '1.2rem' },
  sectionTitle: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14, color: '#131A48', marginBottom: '0.7rem', paddingBottom: 6, borderBottom: '2px solid #FF5800', display: 'inline-block' },
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  btn:     {
    background: '#FF5800', color: '#fff', border: 'none', borderRadius: 4,
    padding: '0.65rem 2rem', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  btnDisabled: {
    background: '#CECECE', color: '#fff', border: 'none', borderRadius: 4,
    padding: '0.65rem 2rem', fontSize: 13, fontWeight: 700, cursor: 'not-allowed',
    letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  totalRow: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem',
    borderTop: '2px solid #131A48',
  },
  summaryBlock: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #E4E4E8',
    display: 'grid',
    gap: '0.5rem',
  },
  nudge: {
    padding: '0.7rem 0.85rem',
    borderRadius: 6,
    border: '1px solid #F1C97B',
    background: '#FFF7E7',
    color: '#8A5600',
    fontSize: 12,
    fontWeight: 700,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '1rem',
  },
  totalLabel: { fontWeight: 700, fontSize: 14, color: '#131A48' },
  totalValue: { fontWeight: 700, fontSize: 16, color: '#131A48' },
  offerValue: { fontWeight: 700, fontSize: 15, color: '#1e5c2c' },
  tag: (color, bg) => ({
    display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '1px 6px',
    borderRadius: 20, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em',
  }),
}

// ── Component ────────────────────────────────────────────────────

export default function App() {
  const [isPdfBusy, setIsPdfBusy] = useState(false)
  const cartSnapshot = useSyncExternalStore(
    (listener) => cartStore.subscribe(listener),
    () => cartStore.getSnapshot(),
    () => cartStore.getSnapshot()
  )

  // ── Handlers ──

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText)
    cartStore.replaceRules(data, errors, fileName, 'csv')
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText)
    cartStore.replaceCart(
      data,
      errors.map((reason, index) => ({ rowNumber: index + 2, row: null, reason })),
      fileName,
      'csv'
    )
  }

  async function handlePdfLoad(file) {
    setIsPdfBusy(true)
    try {
      await extractPdfCart(file)
    } catch (error) {
      cartStore.replaceCart(
        [],
        [{ rowNumber: 0, row: null, reason: error instanceof Error ? error.message : 'Failed to parse PDF cart' }],
        file.name,
        'pdf'
      )
    } finally {
      setIsPdfBusy(false)
    }
  }

  // ── Render ──

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logoTxt}>O<span style={S.logoSpan}>pp</span>tra</div>
        <div style={S.headerSub}>Discount Engine</div>
      </div>

      <div style={S.main}>

        {/* Natural language rules */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Natural Language Rule</div>
          <NLRuleParser />
        </div>

        {/* Upload row */}
        <div style={S.grid2}>
          {/* Rules upload */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Discount Rules</div>
            <CsvUploader
              label="rules.csv"
              description="Upload your discount rules CSV"
              onLoad={handleRulesLoad}
              hasData={cartSnapshot.rules.length > 0}
              fileName={cartSnapshot.ruleFileName}
            />
            <ErrorBanner errors={cartSnapshot.ruleErrors} />
            {cartSnapshot.rules.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                  {cartSnapshot.rules.length} rule{cartSnapshot.rules.length > 1 ? 's' : ''} loaded
                </div>
                <DataTable columns={RULES_COLUMNS} rows={cartSnapshot.rules} />
              </div>
            )}
          </div>

          {/* Cart upload */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Cart Items</div>
            <CsvUploader
              label="cart.csv"
              description="Upload your cart CSV"
              onLoad={handleCartLoad}
              hasData={cartSnapshot.cartItems.length > 0}
              fileName={cartSnapshot.cartFileName}
            />
            <div style={{ marginTop: 10 }}>
              <PdfUploader
                label="cart.pdf"
                description="Upload the sample PDF cart"
                onLoad={handlePdfLoad}
                hasData={cartSnapshot.cartSource === 'pdf' && cartSnapshot.cartItems.length > 0}
                fileName={cartSnapshot.cartFileName}
                isBusy={isPdfBusy}
              />
            </div>

            {cartSnapshot.cartIssues.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                  {cartSnapshot.cartIssues.length} malformed row{cartSnapshot.cartIssues.length > 1 ? 's' : ''} flagged
                </div>
                <DataTable columns={CART_ISSUE_COLUMNS} rows={cartSnapshot.cartIssues} emptyMessage="No malformed rows." />
              </div>
            )}

            {cartSnapshot.cartItems.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                  {cartSnapshot.cartItems.length} item{cartSnapshot.cartItems.length > 1 ? 's' : ''} loaded
                </div>
                <DataTable columns={CART_COLUMNS} rows={cartSnapshot.cartItems} />
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.2rem', fontSize: 11, color: '#666' }}>
          Results update automatically when rules or cart items change.
        </div>

        {/* Results */}
        {(cartSnapshot.cartItems.length > 0 || cartSnapshot.rules.length > 0) && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Cart Summary</div>
            <DataTable columns={RESULTS_COLUMNS} rows={cartSnapshot.pricedCart.pricedItems} />
            <div style={S.summaryBlock}>
              {cartSnapshot.cartOfferNudge && (
                <div style={S.nudge}>{cartSnapshot.cartOfferNudge}</div>
              )}
              <div style={S.summaryRow}>
                <span style={S.totalLabel}>Item total before cart offer</span>
                <span style={S.totalValue}>Rs.{cartSnapshot.pricedCart.itemTotalBeforeCartOffer.toLocaleString('en-IN')}</span>
              </div>
              {cartSnapshot.pricedCart.cartOffer && (
                <div style={S.summaryRow}>
                  <span style={S.totalLabel}>Cart offer: {cartSnapshot.pricedCart.cartOffer.label}</span>
                  <span style={S.offerValue}>-Rs.{cartSnapshot.pricedCart.cartOffer.amountSaved.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={S.totalRow}>
                <span style={S.totalLabel}>Cart Total</span>
                <span style={S.totalValue}>Rs.{cartSnapshot.pricedCart.finalCartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
