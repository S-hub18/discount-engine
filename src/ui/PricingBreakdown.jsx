import { money, ruleValueLabel } from '../lib/format.js'

function formatRupees(value) {
  return `Rs.${Math.round(value).toLocaleString('en-IN')}`
}

function calculateSaving(price, rule) {
  if (rule.type === 'percentage') {
    return Math.round((price * rule.value) / 100)
  }

  return Math.round(rule.value)
}

function formatRuleDiscount(rule) {
  return rule.type === 'percentage' ? `−${rule.value}%` : `−${formatRupees(rule.value)}`
}

function formatAppliedRules(item, rulesById) {
  const appliedRules = (item.appliedRules ?? [])
    .map((ruleId) => rulesById.get(ruleId))
    .filter(Boolean)
  const skippedRules = (item.skippedRules ?? [])
    .map((ruleId) => rulesById.get(ruleId))
    .filter(Boolean)

  if (appliedRules.length === 0) {
    return {
      appliedText: 'No rules match',
      status: 'No offer',
    }
  }

  const nonStackableApplied = appliedRules.find((rule) => !rule.stackable)
  const stackableApplied = appliedRules.filter((rule) => rule.stackable)
  const nonStackableSkipped = skippedRules.filter((rule) => !rule.stackable)

  const parts = []

  if (nonStackableApplied) {
    if (nonStackableSkipped.length > 0) {
      const winnerSaving = calculateSaving(item.basePrice, nonStackableApplied)
      const bestSkipped = [...nonStackableSkipped].sort(
        (left, right) => calculateSaving(item.basePrice, right) - calculateSaving(item.basePrice, left),
      )[0]
      const skippedSaving = calculateSaving(item.basePrice, bestSkipped)
      parts.push(
        `${nonStackableApplied.ruleId} wins (${formatRupees(winnerSaving)} saving > ${formatRupees(skippedSaving)})`,
      )
    } else {
      parts.push(`${nonStackableApplied.ruleId} (${formatRuleDiscount(nonStackableApplied)})`)
    }
  }

  let runningPrice = item.basePrice
  if (nonStackableApplied) {
    runningPrice -= calculateSaving(runningPrice, nonStackableApplied)
  }

  for (const rule of stackableApplied) {
    parts.push(`${rule.ruleId} stacked (${formatRuleDiscount(rule)})`)
    runningPrice -= calculateSaving(runningPrice, rule)
  }

  const status = stackableApplied.length > 0
    ? 'Stacked'
    : nonStackableSkipped.length > 0
      ? 'Max discount'
      : 'Discount applied'

  return {
    appliedText: parts.join(' + '),
    status,
  }
}

function StatusBadge({ status }) {
  const className =
    status === 'No offer'
      ? 'badge badge--tag'
      : status === 'Max discount'
        ? 'badge badge--soft'
        : 'badge badge--success'

  return <span className={className}>{status}</span>
}

export default function PricingBreakdown({ snapshot }) {
  const pricedItems = snapshot.pricedCart.pricedItems
  const rulesById = new Map(snapshot.rules.map((rule) => [rule.ruleId, rule]))

  if (!pricedItems || pricedItems.length === 0) {
    return (
      <div className="breakdown card card--bone" style={{ marginTop: 18 }}>
        <div className="breakdown__head">
          <div>
            <div className="eyebrow">Pricing breakdown</div>
            <h3 className="breakdown__title" style={{ marginTop: 6 }}>Nothing to explain yet</h3>
          </div>
        </div>
        <p className="breakdown__empty">
          Add cart items to see which rule wins on each row, how stackable offers layer, and how the cart offer
          changes the final total.
        </p>
      </div>
    )
  }

  const rows = pricedItems.map((item) => {
    const applied = formatAppliedRules(item, rulesById)
    return {
      ...item,
      appliedText: applied.appliedText,
      status: applied.status,
    }
  })

  const cartOfferRule = snapshot.pricedCart.cartOffer
    ? rulesById.get(snapshot.pricedCart.cartOffer.ruleId)
    : null

  return (
    <div className="breakdown card card--bone">
      <div className="breakdown__head">
        <div>
          <div className="eyebrow">Pricing breakdown</div>
          <h3 className="breakdown__title" style={{ marginTop: 6 }}>How every offer was applied</h3>
        </div>
        <div className="breakdown__legend">
          <span className="badge badge--tag">No offer</span>
          <span className="badge badge--soft">Discount / stacked</span>
          <span className="badge badge--success">Applied</span>
        </div>
      </div>

      <div className="table-wrap breakdown__table">
        <table className="tbl breakdown-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Base price</th>
              <th>Rule(s) applied</th>
              <th>Final price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.itemId}>
                <td>
                  <div className="breakdown-table__item">{item.itemId}</div>
                  <div className="breakdown-table__meta">{item.product}</div>
                </td>
                <td>{formatRupees(item.basePrice)}</td>
                <td>
                  <div className="breakdown-table__rules">{item.appliedText}</div>
                  {item.reasoning && <div className="breakdown-table__meta">{item.reasoning}</div>}
                </td>
                <td>
                  <div className="breakdown-table__price">{formatRupees(item.finalPrice)}</div>
                  {item.totalDiscount ? (
                    <div className="breakdown-table__meta">Saved {formatRupees(item.totalDiscount)}</div>
                  ) : null}
                </td>
                <td><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="breakdown-summary">
        <div className="sum-row">
          <span className="sum-row__label">Cart Total before offer</span>
          <span className="sum-row__val">{money(snapshot.pricedCart.itemTotalBeforeCartOffer)}</span>
        </div>

        {snapshot.pricedCart.cartOffer ? (
          <div className="sum-row sum-row--save">
            <span className="sum-row__label">
              Cart Offer — {cartOfferRule ? cartOfferRule.ruleId : snapshot.pricedCart.cartOffer.ruleId}
            </span>
            <span className="sum-row__val">
              {cartOfferRule && typeof cartOfferRule.minCartValue === 'number'
                ? `${formatRupees(snapshot.pricedCart.itemTotalBeforeCartOffer)} ≥ ${formatRupees(cartOfferRule.minCartValue)} → ${ruleValueLabel(cartOfferRule)} → −${money(snapshot.pricedCart.cartOffer.amountSaved)}`
                : `−${money(snapshot.pricedCart.cartOffer.amountSaved)}`}
            </span>
          </div>
        ) : snapshot.cartOfferNudge ? (
          <div className="nudge breakdown__nudge">✨ {snapshot.cartOfferNudge}</div>
        ) : null}

        <div className="sum-row sum-row--total">
          <span className="sum-row__label">Final Cart Total</span>
          <span className="sum-row__val">{money(snapshot.pricedCart.finalCartTotal)}</span>
        </div>
      </div>
    </div>
  )
}