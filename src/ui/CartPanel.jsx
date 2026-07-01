import { money } from '../lib/format.js'

export default function CartPanel({
  lines,
  itemTotalBeforeCartOffer,
  cartOffer,
  finalCartTotal,
  totalSaved,
  nudge,
  open,
  onClose,
  onAddProduct,
  onRemoveProduct,
  onClear,
  productEmoji,
}) {
  const hasLines = lines.length > 0

  return (
    <>
      <div
        className={'cart-scrim' + (open ? ' cart-scrim--open' : '')}
        onClick={onClose}
      />

      <aside className={'cart' + (open ? ' cart--open' : '')} aria-label="Cart">
        <div className="cart__head">
          <span className="cart__title">Your cart</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasLines && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onClear}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="Close cart"
            >
              ×
            </button>
          </div>
        </div>

        {!hasLines ? (
          <div className="cart__empty">
            Your cart is empty.
            <br />
            Add products to see live pricing.
          </div>
        ) : (
          <>
            <div className="cart__items">
              {lines.map((line) => (
                <div className="cart-line" key={line.key}>
                  <div className="cart-line__thumb">
                    {productEmoji(line.productId) || '🛍️'}
                  </div>
                  <div className="cart-line__main">
                    <div className="cart-line__name">{line.product}</div>
                    <div className="cart-line__meta">
                      {line.brand} · {line.platform}
                    </div>
                    {line.reasoning && (
                      <div className="cart-line__reason">{line.reasoning}</div>
                    )}
                    {line.productId ? (
                      <div className="qty">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onRemoveProduct(line.productId)}
                          aria-label="Remove one"
                        >
                          −
                        </button>
                        <span className="qty__n">{line.qty}</span>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onAddProduct(line.productId)}
                          aria-label="Add one"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="cart-line__meta">Qty {line.qty}</span>
                    )}
                  </div>
                  <div className="cart-line__right">
                    <div className="cart-line__price">{money(line.lineFinal)}</div>
                    {line.lineSave > 0 && (
                      <div className="cart-line__was">{money(line.lineBase)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="cart__summary">
              <div className="sum-row">
                <span className="sum-row__label">Item total</span>
                <span className="sum-row__val">
                  {money(itemTotalBeforeCartOffer)}
                </span>
              </div>

              {cartOffer && (
                <div className="sum-row sum-row--save">
                  <span className="sum-row__label">
                    Cart offer · {cartOffer.label}
                  </span>
                  <span className="sum-row__val">
                    −{money(cartOffer.amountSaved)}
                  </span>
                </div>
              )}

              {totalSaved > 0 && (
                <div className="sum-row sum-row--save">
                  <span className="sum-row__label">You save</span>
                  <span className="sum-row__val">
                    <span className="badge badge--soft">{money(totalSaved)}</span>
                  </span>
                </div>
              )}

              {nudge && <div className="nudge">✨ {nudge}</div>}

              <div className="sum-row sum-row--total">
                <span className="sum-row__label">Total</span>
                <span className="sum-row__val">{money(finalCartTotal)}</span>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--block"
                style={{ marginTop: 12 }}
              >
                Checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
