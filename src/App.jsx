/**
 * App.jsx
 *
 * Opptra storefront — an e-commerce surface over the discount engine.
 * Shoppers browse a catalog and add items to a cart that prices itself live
 * (brand / platform / cart-wide offers). Merchants still have the full Rule
 * Studio: natural-language rules plus CSV and PDF import. Everything flows
 * through the same cartStore + engine.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import cartStore from './state/cartStore'
import { extractPdfCart } from './adapters/pdf/orchestrator'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import { CATALOG, SEED_CART, SEED_RULES } from './data/catalog.js'
import { groupCartLines, quantityByProduct } from './lib/cart.js'

import StoreHeader from './ui/StoreHeader.jsx'
import Hero from './ui/Hero.jsx'
import OffersStrip from './ui/OffersStrip.jsx'
import ProductGrid from './ui/ProductGrid.jsx'
import CartPanel from './ui/CartPanel.jsx'
import RuleStudio from './ui/RuleStudio.jsx'
import Footer from './ui/Footer.jsx'

const EMOJI_BY_ID = Object.fromEntries(CATALOG.map((p) => [p.id, p.emoji]))

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function App() {
  const [isPdfBusy, setIsPdfBusy] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const snapshot = useSyncExternalStore(
    (listener) => cartStore.subscribe(listener),
    () => cartStore.getSnapshot(),
    () => cartStore.getSnapshot(),
  )

  // Seed sample offers on first visit so the store discounts out of the box.
  useEffect(() => {
    if (cartStore.getSnapshot().rules.length === 0) {
      cartStore.replaceRules(SEED_RULES, [], 'sample-data/rules.csv', 'csv')
    }
    if (cartStore.getSnapshot().cartItems.length === 0) {
      cartStore.replaceCart(SEED_CART, [], 'sample-data/cart.csv', 'csv')
    }
  }, [])

  // ── Derived view-model ──
  const lines = groupCartLines(snapshot)
  const qtyByProduct = quantityByProduct(snapshot)
  const cartCount = snapshot.cartItems.length
  const sumBase = lines.reduce((sum, l) => sum + l.lineBase, 0)
  const finalCartTotal = snapshot.pricedCart.finalCartTotal
  const totalSaved = Math.max(0, sumBase - finalCartTotal)

  // ── Rule / cart import handlers (CSV + PDF) ──
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
      'csv',
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
        'pdf',
      )
    } finally {
      setIsPdfBusy(false)
    }
  }

  // ── Storefront cart handlers ──
  const addProduct = (product) => cartStore.addProduct(product)
  const removeProduct = (productId) => cartStore.removeOneOfProduct(productId)
  const clearCart = () => cartStore.clearCart()
  const clearRules = () => cartStore.replaceRules([], [], '', null)

  return (
    <>
      <StoreHeader
        cartCount={cartCount}
        cartTotal={finalCartTotal}
        onCartClick={() => setCartOpen(true)}
        onNav={scrollToId}
      />

      <Hero onShop={() => scrollToId('shop')} onStudio={() => scrollToId('studio')} />

      {/* Active offers */}
      <section id="offers" className="section--tight" style={{ paddingTop: 40, paddingBottom: 8 }}>
        <div className="container">
          <OffersStrip rules={snapshot.rules} />
        </div>
      </section>

      {/* Storefront */}
      <section id="shop" className="section">
        <div className="container">
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow">The shop</div>
            <h2 className="section-title" style={{ marginTop: 8 }}>Browse &amp; build your cart</h2>
            <p className="lead" style={{ marginTop: 12 }}>
              Add anything — prices update the moment an offer applies. Stackable platform deals layer on top of the
              best brand offer, and cart-wide thresholds kick in automatically.
            </p>
          </div>

          <div className="shop-layout">
            <ProductGrid
              products={CATALOG}
              rules={snapshot.rules}
              qtyByProduct={qtyByProduct}
              onAdd={addProduct}
              onRemove={removeProduct}
            />

            <CartPanel
              lines={lines}
              itemTotalBeforeCartOffer={snapshot.pricedCart.itemTotalBeforeCartOffer}
              cartOffer={snapshot.pricedCart.cartOffer}
              finalCartTotal={finalCartTotal}
              totalSaved={totalSaved}
              nudge={snapshot.cartOfferNudge}
              open={cartOpen}
              onClose={() => setCartOpen(false)}
              onAddProduct={(id) => {
                const p = CATALOG.find((x) => x.id === id)
                if (p) addProduct(p)
              }}
              onRemoveProduct={removeProduct}
              onClear={clearCart}
              productEmoji={(id) => EMOJI_BY_ID[id]}
            />
          </div>
        </div>
      </section>

      {/* Rule Studio — dark band */}
      <section id="studio" className="section" style={{ background: 'var(--surface-dark)' }}>
        <RuleStudio
          snapshot={snapshot}
          isPdfBusy={isPdfBusy}
          onRulesLoad={handleRulesLoad}
          onCartLoad={handleCartLoad}
          onPdfLoad={handlePdfLoad}
          onClearRules={clearRules}
        />
      </section>

      <Footer />

      {/* Mobile cart launcher */}
      <button type="button" className="cart-fab" onClick={() => setCartOpen(true)} aria-label="Open cart">
        🛒 <span>{cartCount} item{cartCount === 1 ? '' : 's'}</span>
        <span className="cart-pill__count">{`₹${Math.round(finalCartTotal).toLocaleString('en-IN')}`}</span>
      </button>
    </>
  )
}
