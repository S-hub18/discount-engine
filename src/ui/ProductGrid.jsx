import { useMemo, useState } from 'react'
import ProductCard from './ProductCard.jsx'
import { priceUnit } from '../lib/cart.js'

export default function ProductGrid({ products, rules, qtyByProduct, onAdd, onRemove }) {
  const [filter, setFilter] = useState({ kind: 'all', value: 'All' })

  const facets = useMemo(() => {
    const platforms = [...new Set(products.map((p) => p.platform))].sort()
    const brands = [...new Set(products.map((p) => p.brand))].sort()
    return { platforms, brands }
  }, [products])

  const visible = products.filter((p) => {
    if (filter.kind === 'all') return true
    if (filter.kind === 'platform') return p.platform === filter.value
    if (filter.kind === 'brand') return p.brand === filter.value
    return true
  })

  const isActive = (kind, value) => filter.kind === kind && filter.value === value

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={`pill${isActive('all', 'All') ? ' pill--active' : ''}`}
          onClick={() => setFilter({ kind: 'all', value: 'All' })}
        >
          All products
        </button>
        {facets.platforms.map((p) => (
          <button
            key={`pf-${p}`}
            type="button"
            className={`pill${isActive('platform', p) ? ' pill--active' : ''}`}
            onClick={() => setFilter({ kind: 'platform', value: p })}
          >
            {p}
          </button>
        ))}
        {facets.brands.map((b) => (
          <button
            key={`br-${b}`}
            type="button"
            className={`pill${isActive('brand', b) ? ' pill--active' : ''}`}
            onClick={() => setFilter({ kind: 'brand', value: b })}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            priced={priceUnit(product, rules)}
            qty={qtyByProduct[product.id] || 0}
            onAdd={() => onAdd(product)}
            onRemove={() => onRemove(product.id)}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', color: '#8d8d8d', padding: '32px 0' }}>No products match this filter.</div>
      )}
    </div>
  )
}
