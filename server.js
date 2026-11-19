import express from "express";
import Razorpay from "razorpay";
import crypto from "node:crypto";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "32kb" }));

const PORT = process.env.PORT || 3000;
const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const PAYMENT_MODE = KEY_ID.startsWith("rzp_live_")
  ? "live"
  : KEY_ID.startsWith("rzp_test_") ? "test" : "unconfigured";
const LIVE_PAYMENTS_ENABLED = process.env.LIVE_PAYMENTS_ENABLED === "true";
const LIVE_PRICES_CONFIRMED = process.env.LIVE_PRICES_CONFIRMED === "true";
const DEFAULT_FRONTEND_ORIGIN = "https://meerannoufal03-oss.github.io";
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN)
    .split(",").map(value => value.trim()).filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (allowedOrigins.has(origin) || isLocalDevOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Supports separate Razorpay Test and Live API key pairs.
// The key secret is read only by this backend and is never returned to Checkout.
function getRazorpay() {
  const validMode = PAYMENT_MODE === "test" || PAYMENT_MODE === "live";
  if (!KEY_ID || !KEY_SECRET || !validMode) {
    const error = new Error("Razorpay API keys are not configured. Add a valid Test or Live key pair to the server.");
    error.status = 503;
    throw error;
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

function ensureCheckoutEnabled() {
  if (PAYMENT_MODE === "live" && (!LIVE_PAYMENTS_ENABLED || !LIVE_PRICES_CONFIRMED)) {
    const error = new Error("Live checkout is temporarily disabled until the final selling prices are confirmed and Live payments are enabled.");
    error.status = 503;
    throw error;
  }
}

function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  // Keep secrets and raw provider details out of public error responses.
  console.error("Payment API error:", error.message);
  res.status(status).json({
    error: status === 500 ? "Payment service error. Please try again." : error.message
  });
}

// Amounts are INR paise per 500g pack and must match the website display.
const SAMPLE_PRICES = Object.freeze({
  pickles: 100,           // ₹1 / 500g
  "palm-products": 100,    // ₹1 / 500g
  uppukandam: 100,        // ₹1 / 500g
  karuvadu: 100           // ₹1 / 500g
});

const CATALOG = Object.freeze({
  pickles: new Set([
    "Chicken Oorugai", "Beef Oorugai", "Mutton Oorugai", "Fish Oorugai",
    "Prawn Oorugai", "Kanava Oorugai", "Chicken Kara Podi"
  ]),
  "palm-products": new Set(["Karupatti", "Panangarkandu"]),
  uppukandam: new Set(["Mutton Boneless Uppukandam", "Beef Boneless Uppukandam"]),
  karuvadu: new Set([
    "Sala", "Thirukkai", "Manja Paarai", "Panna", "Paalnethili", "Kooni",
    "Paal Sura", "Keluthu", "Maavula / Neduva", "Naakku Meen",
    "Seela / Vanjaram", "Pola", "Panna Kuthippu", "Uluva", "Parai"
  ])
});

// OWNER-MANAGED INVENTORY
// Both GitHub Pages and this API read the same file. Only repository editors can change it.
const INVENTORY_URL = process.env.INVENTORY_URL || "https://raw.githubusercontent.com/meerannoufal03-oss/ular-suvai-v3/main/inventory.json";
let inventoryCache = null;
let inventoryFetchedAt = 0;
const INVENTORY_CACHE_MS = 15_000;
async function getInventoryProducts() {
  if (inventoryCache && Date.now() - inventoryFetchedAt < INVENTORY_CACHE_MS) return inventoryCache;
  let response;
  try {
    response = await fetch(INVENTORY_URL, { headers: { accept: "application/json", "cache-control": "no-cache" }, cache: "no-store" });
  } catch {
    throw Object.assign(new Error("Product availability could not be checked. Please try again."), { status: 503 });
  }
  if (!response.ok) throw Object.assign(new Error("Product availability could not be checked. Please try again."), { status: 503 });
  const data = await response.json();
  if (!data || !data.products || typeof data.products !== "object") throw Object.assign(new Error("Product availability settings are invalid."), { status: 503 });
  inventoryCache = data.products;
  inventoryFetchedAt = Date.now();
  return inventoryCache;
}
const ALLOWED_COUNTRY_CODES = new Set([
  "+91", "+1", "+44", "+971", "+966", "+974", "+965",
  "+968", "+973", "+94", "+60", "+65", "+61"
]);

// Per-instance abuse protection. Payment verification itself is based on
// the signed Razorpay order plus the order record fetched from Razorpay, not
// volatile process memory, so a server restart cannot invalidate a paid order.
const createOrderAttempts = new Map();
const ORDER_WINDOW_MS = 60_000;
const ORDER_LIMIT_PER_WINDOW = 12;

function canCreateOrder(ip) {
  const now = Date.now();
  const current = createOrderAttempts.get(ip);
  if (!current || now - current.startedAt >= ORDER_WINDOW_MS) {
    createOrderAttempts.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= ORDER_LIMIT_PER_WINDOW;
}

app.get("/api/health", (_req, res) => {
  const configured = Boolean(KEY_ID && KEY_SECRET &&
    (PAYMENT_MODE === "test" || PAYMENT_MODE === "live"));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    paymentProvider: "Razorpay",
    mode: PAYMENT_MODE,
    configured,
    livePaymentsEnabled: LIVE_PAYMENTS_ENABLED,
    canAcceptPayments: configured && (
      PAYMENT_MODE === "test" || (LIVE_PAYMENTS_ENABLED && LIVE_PRICES_CONFIRMED)
    ),
    livePricesConfirmed: LIVE_PRICES_CONFIRMED
  });
});

app.post("/api/create-order", async (req, res) => {
  try {
    ensureCheckoutEnabled();
    if (!canCreateOrder(req.ip || req.socket.remoteAddress || "unknown")) {
      return res.status(429).json({ error: "Too many checkout attempts. Please wait a moment and try again." });
    }

    const { items, customer } = req.body || {};
    if (!Array.isArray(items) || items.length < 1 || items.length > 40) {
      return res.status(400).json({ error: "Cart items are invalid." });
    }
    const customerName = String(customer?.name || "").trim().replace(/\s+/g, " ");
    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(customerName)) {
      return res.status(400).json({ error: "Enter a valid name using English letters only." });
    }
    if (!ALLOWED_COUNTRY_CODES.has(customer.countryCode) || !/^\d{10}$/.test(String(customer.phone || ""))) {
      return res.status(400).json({ error: "Select a country code and enter a 10-digit phone number." });
    }
    if (!String(customer.address || "").trim() || String(customer.address).length > 500) {
      return res.status(400).json({ error: "Enter a valid delivery address." });
    }

    const inventoryProducts = await getInventoryProducts();
    // Product name, category and quantity are allow-listed and prices are calculated here.
    const normalized = items.map(item => {
      const category = String(item.category || "");
      const name = String(item.name || "").trim();
      const quantity = Number(item.quantity);
      if (!CATALOG[category]?.has(name) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw Object.assign(new Error("Cart contains an invalid product or quantity."), { status: 400 });
      }
      if (inventoryProducts[category + ":" + name] !== true) {
        throw Object.assign(new Error("One or more products are currently out of stock."), { status: 409 });
      }
      return { category, name, quantity, unitAmount: SAMPLE_PRICES[category] };
    });

    const amount = normalized.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 5_000_000) {
      return res.status(400).json({ error: "Order amount is outside the allowed range." });
    }

    const instance = getRazorpay();
    const itemsSummary = normalized.map(item => `${item.name} x${item.quantity}`).join("; ");
    const deliveryAddress = String(customer.address).trim();
    const order = await instance.orders.create({
      amount,
      currency: "INR",
      receipt: `us_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      payment: { capture: "automatic" },
      // Keep fulfilment details in Razorpay Order Notes for the merchant.
      // Each value stays within Razorpay's 256-character note value limit.
      notes: {
        customer_name: customerName.slice(0, 100),
        customer_phone: `${customer.countryCode}${customer.phone}`,
        delivery_address_1: deliveryAddress.slice(0, 250),
        delivery_address_2: deliveryAddress.slice(250, 500),
        items_summary_1: itemsSummary.slice(0, 250),
        items_summary_2: itemsSummary.slice(250, 500),
        items_summary_3: itemsSummary.slice(500, 750),
        sample_pricing: "true",
        item_count: String(normalized.reduce((sum, item) => sum + item.quantity, 0)),
        checkout: `ular_suvai_${PAYMENT_MODE}_checkout`
      }
    });

    // Key ID is public and required by Checkout.js; Key Secret never leaves this server.
    res.json({ keyId: KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency, mode: PAYMENT_MODE });
  } catch (error) {
    sendError(res, error);
  }
});

// Server-side status lookup for UPI QR / delayed Checkout callbacks.
// Only orders created by this Ular Suvai checkout can be queried.
app.get("/api/order-status", async (req, res) => {
  try {
    const orderId = String(req.query.order_id || "");
    if (!/^order_[A-Za-z0-9]+$/.test(orderId)) {
      return res.status(400).json({ error: "A valid Razorpay order ID is required." });
    }

    const razorpay = getRazorpay();
    let order = await razorpay.orders.fetch(orderId);
    const expectedCheckoutNote = `ular_suvai_${PAYMENT_MODE}_checkout`;
    if (
      order.id !== orderId ||
      !String(order.receipt || "").startsWith("us_") ||
      order.notes?.checkout !== expectedCheckoutNote
    ) {
      return res.status(404).json({ error: "Ular Suvai order was not found." });
    }

    const expectedAmount = order.amount;
    if (
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount < 100 ||
      expectedAmount > 5_000_000 ||
      order.currency !== "INR"
    ) {
      return res.status(409).json({ error: "Order amount or currency is invalid." });
    }

    let payments = await razorpay.orders.fetchPayments(orderId);
    const isExactCapturedPayment = payment =>
      payment.order_id === orderId &&
      payment.currency === "INR" &&
      payment.amount === expectedAmount &&
      payment.captured === true &&
      payment.status === "captured";

    let capturedPayment = (payments.items || []).find(isExactCapturedPayment);

    // Auto-capture is enabled on new orders. This fallback handles a delayed
    // authorization by attempting capture once when the customer is polling.
    if (!capturedPayment) {
      const authorizedPayment = (payments.items || []).find(payment =>
        payment.order_id === orderId &&
        payment.currency === "INR" &&
        payment.amount === expectedAmount &&
        payment.status === "authorized"
      );
      if (authorizedPayment) {
        try {
          await razorpay.payments.capture(authorizedPayment.id, expectedAmount, "INR");
        } catch (captureError) {
          // A concurrent auto-capture may have completed the same payment.
          console.warn("Order status capture check:", captureError.message);
        }
        order = await razorpay.orders.fetch(orderId);
        payments = await razorpay.orders.fetchPayments(orderId);
        capturedPayment = (payments.items || []).find(isExactCapturedPayment);
      }
    }

    const verified = Boolean(
      order.status === "paid" &&
      order.amount_paid === expectedAmount &&
      order.amount_due === 0 &&
      capturedPayment
    );
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ok: true,
      verified,
      paid: verified,
      orderId,
      status: order.status,
      paymentId: capturedPayment?.id || null,
      amount: expectedAmount,
      currency: "INR",
      mode: PAYMENT_MODE
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature]
      .every(value => typeof value === "string" && value.length > 0)) {
      return res.status(400).json({ error: "Payment verification details are missing." });
    }

    const expected = crypto.createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const suppliedBuffer = Buffer.from(razorpay_signature, "hex");
    if (!KEY_SECRET || expectedBuffer.length !== suppliedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(400).json({ verified: false, error: "Payment signature verification failed." });
    }

    const razorpay = getRazorpay();
    // Fetch the order from Razorpay, not a volatile server-side Map.
    const originalOrder = await razorpay.orders.fetch(razorpay_order_id);
    const expectedCheckoutNote = `ular_suvai_${PAYMENT_MODE}_checkout`;
    if (
      !String(originalOrder.receipt || "").startsWith("us_") ||
      originalOrder.notes?.checkout !== expectedCheckoutNote
    ) {
      return res.status(400).json({
        verified: false,
        error: "This Razorpay order was not created by the current Ular Suvai checkout."
      });
    }
    let payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Validate the fetched Razorpay entities before attempting any capture.
    // Orders for this storefront must always be INR and within the server's order limit.
    const expectedAmount = originalOrder.amount;
    if (
      originalOrder.id !== razorpay_order_id ||
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount < 100 ||
      expectedAmount > 5_000_000 ||
      originalOrder.currency !== "INR" ||
      payment.id !== razorpay_payment_id ||
      payment.order_id !== razorpay_order_id ||
      payment.currency !== "INR" ||
      payment.currency !== originalOrder.currency ||
      payment.amount !== expectedAmount
    ) {
      return res.status(409).json({
        verified: false,
        error: "Payment amount or order details do not match. Please create a new checkout order."
      });
    }

    // Checkout can report an authorization before Razorpay has captured it.
    // Capture only after signature, order ID, currency and exact amount checks pass.
    if (payment.status === "authorized") {
      try {
        payment = await razorpay.payments.capture(
          razorpay_payment_id,
          originalOrder.amount,
          originalOrder.currency
        );
      } catch (captureError) {
        // Auto-capture may complete between our fetch and capture request.
        // Re-fetch once and accept only an actually captured payment.
        payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status !== "captured") throw captureError;
      }
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (
      payment.id !== razorpay_payment_id ||
      payment.order_id !== razorpay_order_id ||
      payment.currency !== "INR" ||
      order.currency !== "INR" ||
      payment.currency !== originalOrder.currency ||
      order.currency !== originalOrder.currency ||
      payment.amount !== expectedAmount ||
      order.amount !== expectedAmount ||
      // Razorpay's Payment entity confirms capture via captured + status.
      // Do not require amount_captured: it is not part of the documented
      // captured Payment entity response; exact amount is checked above.
      payment.captured !== true ||
      payment.status !== "captured" ||
      order.status !== "paid"
    ) {
      console.warn("Razorpay verification pending:", JSON.stringify({
        paymentStatus: payment.status,
        captured: payment.captured,
        paymentAmount: payment.amount,
        orderStatus: order.status,
        orderAmount: order.amount,
        expectedAmount: originalOrder.amount,
        orderIdMatches: payment.order_id === razorpay_order_id,
        paymentCurrency: payment.currency,
        orderCurrency: order.currency,
        expectedCurrency: originalOrder.currency
      }));
      return res.status(409).json({
        verified: false,
        error: "Razorpay has not confirmed a fully captured payment for this exact order amount. Please check the Razorpay payment status before retrying."
      });
    }

    res.json({
      verified: true,
      paymentId: payment.id,
      orderId: razorpay_order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      mode: PAYMENT_MODE
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  const configured = Boolean(KEY_ID && KEY_SECRET &&
    (PAYMENT_MODE === "test" || PAYMENT_MODE === "live"));
  const liveEnabled = PAYMENT_MODE === "live" && LIVE_PAYMENTS_ENABLED && LIVE_PRICES_CONFIRMED;
  console.log(`Ular Suvai Razorpay API listening on ${PORT}; mode: ${PAYMENT_MODE}; credentials configured: ${configured}; live checkout enabled: ${liveEnabled}`);
});
