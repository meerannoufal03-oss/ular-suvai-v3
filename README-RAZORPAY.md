# Ular Suvai Razorpay Test API

This service creates Razorpay Orders and verifies checkout signatures server-side.

## Environment variables
- `RAZORPAY_KEY_ID`: Test-mode key ID.
- `RAZORPAY_KEY_SECRET`: Test-mode key secret. Keep this only in the backend host's secret environment.
- `FRONTEND_ORIGIN`: Allowed website origin, if CORS is added later.

## Deploy
Render web service, branch `ecommerce-cart-demo`, runtime Node, build command `npm install`, start command `npm start`.

## API
- `GET /api/health`
- `POST /api/create-order`
- `POST /api/verify-payment`

Prices are fixed server-side as temporary demo amounts: pickles INR 150, palm products INR 80, uppukandam INR 220, karuvadu INR 120, per unit. The backend ignores browser-supplied prices and calculates the amount itself.

Use Razorpay Test Mode credentials only. Verify successful payments using the signature returned by Checkout and then check the payment's associated order and status before displaying success.
