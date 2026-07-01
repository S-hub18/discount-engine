import React from 'react';

export default function Hero({ onShop, onStudio }) {
  return (
    <section className="hero">
      <div className="hero__inner container">
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.85,
            marginBottom: 18,
          }}
        >
          Live Discount Engine
        </div>
        <h1>
          Shop the offers,
          <br />
          live.
        </h1>
        <p className="hero__sub">
          Add items to your cart and watch brand, platform and cart-wide
          discounts apply in real time — or write a rule in plain English and
          see prices move instantly.
        </p>
        <div className="hero__cta">
          <button type="button" className="btn btn--primary" onClick={onShop}>
            Browse products
          </button>
          <button type="button" className="btn btn--outline" onClick={onStudio}>
            Write a rule →
          </button>
        </div>
      </div>
    </section>
  );
}
