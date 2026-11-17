# Ular Suvai Razorpay Payment API

This service creates Razorpay Orders, returns the public Checkout Key ID, verifies Checkout signatures on the server, fetches the associated Razorpay Order and Payment, and only confirms success when the exact amount is captured.

## Runtime environment variables

- `RAZORPAY_KEY_ID`: Razorpay API Key ID. Test keys begin with `rzp_test_`; Live keys begin with `rzp_live_`.
- `RAZORPAY_KEY_SECRET`: matching API Key Secret. Store this only in the backend host's secret environment. Never commit it to GitHub or share it in chat.
- `FRONTEND_ORIGINS`: comma-separated website origins allowed by CORS.
- `LIVE_PAYMENTS_ENABLED`: set to `true` only when the live account, final prices, fulfilment and operational checks are ready.
- `LIVE_PRICES_CONFIRMED`: set to `true` only after replacing the demo prices in both `server.js` and `script.js` with the approved selling prices.

## Mode selection and launch lock

The API mode is detected from the key prefix:
- `rzp_test_` → Test Mode (simulated transactions).
- `rzp_live_` → Live Mode (real customer payments).

Live order creation is blocked unless both `LIVE_PAYMENTS_ENABLED=true` and `LIVE_PRICES_CONFIRMED=true`. This guard prevents accidental real charges while the website still contains demo prices.

## Current temporary prices — NOT APPROVED FOR REAL SALES

The current values are placeholders per 500g:
- Pickles: ₹150
- Palm Products: ₹80
- Uppukandam: ₹220
- Karuvadu: ₹120

Replace these values in `server.js` (`SAMPLE_PRICES`) and `script.js` (`CATEGORY_SAMPLE_PACKS`) with the final owner-approved prices before enabling Live payments.

## Deploy

Render web service:
- Repository: `meerannoufal03-oss/ular-suvai-v3`
- Backend branch: `ecommerce-cart-demo`
- Runtime: Node.js
- Build: `npm install`
- Start: `npm start`

## API endpoints

- `GET /api/health` — reports detected mode, credential configuration and whether checkout is allowed.
- `POST /api/create-order` — validates customer details, inventory and server-side prices; creates a Razorpay Order with customer address and item summary in Order Notes.
- `POST /api/verify-payment` — verifies the HMAC signature, fetches the Razorpay order/payment, checks order marker, amount and currency, captures a valid authorized payment if required, and confirms only a captured payment.

## Before launch

1. Complete Razorpay account activation and verify the account is actually in Live mode.
2. Generate a separate Live API Key ID and Secret in the Razorpay Dashboard.
3. Add both Live values directly to the Render Environment page; never add them to GitHub.
4. Replace the demo prices with final selling prices and confirm delivery charges/taxes, if any.
5. Check stock and fulfilment operations.
6. Set `LIVE_PRICES_CONFIRMED=true` and `LIVE_PAYMENTS_ENABLED=true` only after the previous items are complete.
7. Perform a small, real end-to-end order and confirm the payment is Captured in Razorpay Dashboard before accepting regular customer orders.

The connected Razorpay account's transactions and settlement state should be checked in its own Dashboard. A browser success screen alone is not proof of captured funds.
