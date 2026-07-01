import React from 'react'
import { money } from '../lib/format.js'

/**
 * Product card for the Opptra storefront.
 * Styling lives in src/index.css — this component only composes existing classes.
 */
export default function ProductCard({ product, priced, qty, onAdd, onRemove }) {
  const hasDiscount = priced.totalDiscount > 0

  return (
    <div className="product-card">
      <div className="product-card__thumb">
        {product.emoji}
        {hasDiscount && (
          <span className="product-card__save">
            <span className="badge badge--success">Save {money(priced.totalDiscount)}</span>
          </span>
        )}
      </div>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="badge badge--tag">{product.brand}</span>
          <span className="badge badge--tag">{product.platform}</span>
        </div>

        <div className="product-card__name">{product.product}</div>

        <div style={{ fontSize: 12, color: '#646464' }}>{product.blurb}</div>

        <div className="product-card__price">
          {hasDiscount ? (
            <>
              <span className="price-now">{money(priced.finalPrice)}</span>
              <span className="price-was">{money(product.basePrice)}</span>
            </>
          ) : (
            <span className="price-now">{money(product.basePrice)}</span>
          )}
        </div>

        <div className="product-card__reason">{hasDiscount ? priced.reasoning : ''}</div>

        {qty === 0 ? (
          <button type="button" className="btn btn--dark btn--block btn--sm" onClick={onAdd}>
            Add to cart
          </button>
        ) : (
          <div className="qty" style={{ justifyContent: 'space-between', width: '100%' }}>
            <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remove one">
              −
            </button>
            <span className="qty__n">{qty}</span>
            <button type="button" className="icon-btn" onClick={onAdd} aria-label="Add one">
              +
            </button>
            <span style={{ fontSize: 12, color: '#646464' }}>in cart</span>
          </div>
        )}
      </div>
    </div>
  )
}
