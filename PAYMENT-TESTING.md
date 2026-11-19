# Ular Suvai payment testing and launch checklist

## Deployment wiring

- Storefront: `https://meerannoufal03-oss.github.io/ular-suvai-v3/` (GitHub Pages, `main` branch).
- Payment API: `https://ular-suvai-razorpay-test-api.onrender.com` (Render web service, `ecommerce-cart-demo` branch).
- The storefront's `script.js` sends create-order and verify-payment requests to the Render API.
- The Render API's default allowed browser origin is `https://meerannoufal03-oss.github.io`. An origin is the scheme + host; the `/ular-suvai-v3/` page path is not part of the CORS origin.
- Both branches must retain the same `server.js` payment-verification implementation. Render deploys from `ecommerce-cart-demo`; GitHub Pages serves the frontend from `main`.

## Safe Test Mode setup

The Render environment must use a matching Razorpay **Test** key pair:

| Render variable | Test value |
| --- | --- |
| `RAZORPAY_KEY_ID` | Razorpay Test Key ID beginning with `rzp_test_` |
| `RAZORPAY_KEY_SECRET` | Secret that belongs to that exact Test Key ID |
| `LIVE_PAYMENTS_ENABLED` | `false` |
| `LIVE_PRICES_CONFIRMED` | `false` |

Never mix a Test Key ID with a Live Key Secret, or vice versa. Never commit either key or secret to GitHub. Enter them only in the Render service Environment settings.

After saving the variables, wait for the Render deploy to finish before testing. Check:

`https://ular-suvai-razorpay-test-api.onrender.com/api/health`

Expected Test Mode response fields:

- `ok: true`
- `mode: "test"`
- `configured: true`
- `canAcceptPayments: true`
- `livePaymentsEnabled: false`
- `livePricesConfirmed: false`

The `configured` field means the backend has both key fields and recognizes the key prefix. It does **not** independently prove that Razorpay will authenticate the secret; successful Test Mode order creation and verification confirm that.

The storefront now checks this health endpoint before enabling the Pay button. It displays Test Mode, locked Live Mode, or service-unavailable status and fails closed if the API cannot be reached.

## Test checklist

1. Open the GitHub Pages storefront and hard-refresh it.
2. Open the cart and proceed to delivery/payment. Confirm that the page displays **Test Mode** and says no real money is collected.
3. Add one in-stock item, change quantity, remove it, and confirm that the cart total uses the displayed category sample price.
4. Enter valid customer details and a complete delivery address. Confirm the Test Mode Razorpay checkout opens and the test payment can complete.
5. Confirm the storefront shows a verified Test payment reference and that the corresponding order/payment is visible in the Razorpay **Test Mode** dashboard.
6. Try an invalid form and an out-of-stock product. Neither should create a Razorpay order.
7. Confirm the order's amount and currency are INR and that the stored order notes contain the delivery and item summary.
8. Confirm a failed/cancelled test payment does not produce a success message.

Use only Razorpay's Test Mode payment details from the Razorpay Dashboard/documentation. Test Mode simulates transactions; it does not collect real customer money.

## Important current state

If the health endpoint reports `mode: "live"` and `canAcceptPayments: false`, the Render service currently has a Live Key ID but the Live checkout safety lock is still active. To perform a sandbox checkout, switch both Render Razorpay key variables to the matching Test pair and redeploy. The storefront URL does not need a separate payment URL change; it is already configured to call this Render API.

Do not set either Live safety flag to true while the category prices are still sample values.

## Before enabling real payments

- Replace the category sample prices in both `script.js` (rupees shown to customers) and `server.js` (paise charged by the backend). Run `node scripts/verify-payment-readiness.mjs` to check they match.
- Confirm package weight, final selling price, shipping charge, applicable tax, and total payable amount.
- Verify every product's inventory status and product name against the real catalogue.
- Confirm the merchant's order-fulfilment process, customer support contact, cancellation/refund policy, and customer-facing terms/privacy information.
- Test the complete flow in Test Mode before switching to a matching Live key pair.
- Enable `LIVE_PAYMENTS_ENABLED=true` and `LIVE_PRICES_CONFIRMED=true` only after the above checks are complete and the owner explicitly approves real-money checkout.

Keep the Live checkout locked until then.
