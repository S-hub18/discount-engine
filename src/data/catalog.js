/**
 * catalog.js
 *
 * Sample product catalog for the storefront. Brands and platforms intentionally
 * line up with sample-data/rules.csv so the seeded offers light up immediately
 * when a shopper starts adding items to the cart.
 */

export const CATALOG = [
  { id: 'P-01', product: 'Cushion Cover',     brand: 'Natura Casa',   platform: 'Amazon India', basePrice: 1299, emoji: '🛋️', category: 'Living', blurb: 'Hand-loomed cotton, 45×45cm' },
  { id: 'P-02', product: 'Bed Sheet Set',     brand: 'Natura Casa',   platform: 'Flipkart',     basePrice: 849,  emoji: '🛏️', category: 'Bedroom', blurb: 'Queen, 200TC percale' },
  { id: 'P-03', product: 'Ceramic Vase',      brand: 'LivSpace Pro',  platform: 'Noon',         basePrice: 2499, emoji: '🏺', category: 'Decor', blurb: 'Glazed stoneware, matte' },
]

/**
 * Seed offers — mirrors sample-data/rules.csv. Loaded on first visit so the
 * store demonstrates live discounting out of the box. Shoppers can override
 * these by uploading their own rules.csv or writing a natural-language rule.
 */
export const SEED_RULES = [
  { ruleId: 'RULE-01', scope: 'platform', appliesTo: 'Amazon India', type: 'percentage', value: 15, stackable: false },
  { ruleId: 'RULE-02', scope: 'brand',    appliesTo: 'Natura Casa',  type: 'flat',       value: 150, stackable: false },
  { ruleId: 'RULE-03', scope: 'platform', appliesTo: 'Flipkart',     type: 'percentage', value: 10, stackable: true },
  { ruleId: 'RULE-04', scope: 'cart', appliesTo: '', type: 'percentage', value: 10, stackable: false, minCartValue: 5932, label: '10% off' },
]

export const SEED_CART = [
  { itemId: 'ITEM-01', product: 'Cushion Cover', brand: 'Natura Casa', platform: 'Amazon India', basePrice: 1299 },
  { itemId: 'ITEM-02', product: 'Bed Sheet Set', brand: 'Natura Casa', platform: 'Flipkart', basePrice: 849 },
  { itemId: 'ITEM-03', product: 'Wall Shelf', brand: 'LivSpace Pro', platform: 'Amazon India', basePrice: 599 },
  { itemId: 'ITEM-04', product: 'Ceramic Vase', brand: 'LivSpace Pro', platform: 'Noon', basePrice: 2499 },
  { itemId: 'ITEM-05', product: 'Cutting Board', brand: 'Nordic Basics', platform: 'Amazon India', basePrice: 449 },
  { itemId: 'ITEM-06', product: 'Desk Organiser', brand: 'Nordic Basics', platform: 'Flipkart', basePrice: 899 },
]
