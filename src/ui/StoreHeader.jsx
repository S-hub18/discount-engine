import { money } from '../lib/format.js'

/**
 * Sticky top navigation bar for the Opptra storefront.
 *
 * @param {object} props
 * @param {number} props.cartCount - Number of items in the cart.
 * @param {number} props.cartTotal - Already-discounted cart total in rupees.
 * @param {() => void} props.onCartClick - Invoked when the cart pill is clicked.
 * @param {(sectionId: string) => void} props.onNav - Invoked with a section id when a nav link is clicked.
 */
export default function StoreHeader({ cartCount, cartTotal, onCartClick, onNav }) {
  return (
    <header className="nav">
      <div className="nav__inner container">
        <div className="wordmark">O<span>pp</span>tra</div>

        <nav className="nav__links">
          <button type="button" className="nav__link" onClick={() => onNav('shop')}>
            Shop
          </button>
          <button type="button" className="nav__link" onClick={() => onNav('offers')}>
            Offers
          </button>
          <button type="button" className="nav__link" onClick={() => onNav('studio')}>
            Rule Studio
          </button>
        </nav>

        <button
          type="button"
          className="cart-pill"
          onClick={onCartClick}
          aria-label={`Cart, ${cartCount} items`}
        >
          <span aria-hidden="true">🛒</span>
          {money(cartTotal)}
          <span className="cart-pill__count">{cartCount}</span>
        </button>
      </div>
    </header>
  )
}
