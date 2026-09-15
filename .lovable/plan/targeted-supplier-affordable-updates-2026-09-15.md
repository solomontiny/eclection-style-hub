# Targeted Supplier Affordable updates

## Scope

1. **Homepage hero**
   - Upload the third supplied image through the project asset system.
   - Replace only the current hero image source and update its descriptive text.
   - Preserve the existing hero layout, content, buttons, navigation, overlay, and behavior; adjust image positioning only if responsive framing requires it.

2. **Contact page**
   - Remove the visible phone number beneath WhatsApp and remove the public Call block.
   - Keep the WhatsApp link functional and leave email, Instagram, Facebook, and all other contact-page elements unchanged.

3. **Bulk Order page**
   - Keep the current database-backed product list, submission flow, minimum of 12 pieces, and existing 12/100/500 quantity-tier logic.
   - Make quantity controls and the running piece count clearer, including an empty-order state and accessible labels.
   - Display each selected product’s current database price and a running merchandise total calculated from those prices; do not introduce new prices or alter payment/cart behavior.
   - Keep the existing wholesale request form and route intact.

## Technical details

- Extend the existing bulk-order item state with the selected product’s effective price (`sale_price` when present, otherwise `price`).
- Use the existing Naira formatter and existing button component.
- Add route-specific metadata to Bulk Order while preserving all current routes.
- Make no database, authentication, admin, checkout, Paystack, navigation, or unrelated styling changes.

## Validation

- Run the project’s production build/check pipeline.
- Inspect the homepage, Contact page, and Bulk Order page at desktop and mobile widths for image framing, quantity behavior, totals, and overflow.
- Fix only regressions caused by these targeted edits.
