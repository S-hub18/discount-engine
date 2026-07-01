import NLRuleParser from './NLRuleParser.jsx'
import CsvUploader from '../components/CsvUploader.jsx'
import PdfUploader from '../components/PdfUploader.jsx'
import DataTable from '../components/DataTable.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { money } from '../lib/format.js'
import PricingBreakdown from './PricingBreakdown.jsx'

const RULES_COLUMNS = [
  { key: 'ruleId', label: 'Rule' },
  { key: 'scope', label: 'Scope', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies to', render: (v, row) => row.scope === 'cart' ? `≥ ${money(row.minCartValue ?? 0)}` : v || '—' },
  { key: 'type', label: 'Type', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'value', label: 'Value', render: (v, row) => (row.type === 'percentage' ? `${v}% off` : `${money(v)} off`) },
  { key: 'stackable', label: 'Stackable', render: (v) => (v ? 'Yes' : 'No') },
]

const CART_ISSUE_COLUMNS = [
  { key: 'rowNumber', label: 'Row' },
  { key: 'product', label: 'Product', render: (_, row) => row.row?.product ?? '—' },
  { key: 'brand', label: 'Brand', render: (_, row) => row.row?.brand ?? '—' },
  { key: 'platform', label: 'Platform', render: (_, row) => row.row?.platform ?? '—' },
  { key: 'reason', label: 'Reason' },
]

export default function RuleStudio({
  snapshot,
  isPdfBusy,
  onRulesLoad,
  onCartLoad,
  onPdfLoad,
  onClearRules,
}) {
  return (
    <div className="container">
      <div className="eyebrow" style={{ color: 'var(--on-dark-mute)' }}>Merchant tools</div>
      <h2 className="section-title" style={{ color: 'var(--on-dark)', marginTop: 8 }}>Rule Studio</h2>
      <p className="lead" style={{ color: 'var(--on-dark-mute)', marginTop: 12 }}>
        Define offers and they apply across the storefront instantly. Write one in plain English, or bulk-import
        rules and carts from CSV and PDF — every channel feeds the same live engine.
      </p>

      <div className="studio-grid" style={{ marginTop: 32 }}>
        {/* Natural language */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="badge badge--dark">AI</span>
            <strong style={{ fontSize: 16 }}>Natural-language rule</strong>
          </div>
          <NLRuleParser />
        </div>

        {/* Bulk import */}
        <div className="card">
          <strong style={{ fontSize: 16, display: 'block', marginBottom: 14 }}>Bulk import</strong>

          <div className="field-label">Discount rules (CSV)</div>
          <CsvUploader
            label="rules.csv"
            description="rule_id, scope, applies_to, type, value, stackable…"
            onLoad={onRulesLoad}
            hasData={snapshot.rules.length > 0 && snapshot.ruleSource === 'csv'}
            fileName={snapshot.ruleFileName}
          />
          <ErrorBanner errors={snapshot.ruleErrors} />

          <div className="field-label" style={{ marginTop: 16 }}>Cart items (CSV)</div>
          <CsvUploader
            label="cart.csv"
            description="item_id, product, brand, platform, base_price"
            onLoad={onCartLoad}
            hasData={snapshot.cartSource === 'csv' && snapshot.cartItems.length > 0}
            fileName={snapshot.cartFileName}
          />

          <div className="field-label" style={{ marginTop: 16 }}>Cart items (PDF)</div>
          <PdfUploader
            label="cart.pdf"
            description="Upload a PDF cart — rows are extracted automatically"
            onLoad={onPdfLoad}
            hasData={snapshot.cartSource === 'pdf' && snapshot.cartItems.length > 0}
            fileName={snapshot.cartFileName}
            isBusy={isPdfBusy}
          />
        </div>
      </div>

      {/* Active rules */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong style={{ fontSize: 16 }}>
            Active offers {snapshot.rules.length > 0 && <span style={{ color: '#8d8d8d', fontWeight: 500 }}>· {snapshot.rules.length}</span>}
          </strong>
          {snapshot.rules.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClearRules}>Clear all</button>
          )}
        </div>
        <DataTable columns={RULES_COLUMNS} rows={snapshot.rules} emptyMessage="No offers active. Add one above." />
      </div>

      <PricingBreakdown snapshot={snapshot} />

      {/* Malformed import rows */}
      {snapshot.cartIssues.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>
            Flagged rows <span style={{ color: '#8d8d8d', fontWeight: 500 }}>· {snapshot.cartIssues.length}</span>
          </strong>
          <DataTable columns={CART_ISSUE_COLUMNS} rows={snapshot.cartIssues} emptyMessage="No malformed rows." />
        </div>
      )}
    </div>
  )
}
