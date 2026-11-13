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

// Deliberately restrict this service to Razorpay Test Mode credentials.
const isTestKey = KEY_ID.startsWith("rzp_test_");
function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET || !isTestKey) {
    const error = new Error("Razorpay Test Mode keys are not configured on the server.");
    error.status = 503;
    throw error;
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
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
  pickles: 15000,        // ₹150 / 500g
  "palm-products": 8000, // ₹80 / 500g
  uppukandam: 22000,     // ₹220 / 500g
  karuvadu: 12000        // ₹120 / 500g
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

// Memory-based protection is suitable for this single-instance Test Mode service.
// A production deployment should persist pending orders and use webhooks.
const pendingOrders = new Map();
const createOrderAttempts = new Map();
const ORDER_WINDOW_MS = 60_000;
const ORDER_LIMIT_PER_WINDOW = 12;
const PENDING_ORDER_TTL_MS = 60 * 60 * 1000;

function cleanExpiredOrders() {
  const expiry = Date.now() - PENDING_ORDER_TTL_MS;
  for (const [id, record] of pendingOrders) {
    if (record.createdAt < expiry) pendingOrders.delete(id);
  }
}
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
  res.json({
    ok: true,
    paymentProvider: "Razorpay",
    mode: "test",
    configured: Boolean(KEY_ID && KEY_SECRET && isTestKey)
  });
});

app.post("/api/create-order", async (req, res) => {
  try {
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
      return res.status(400).json({ error: "Order amount is outside the allowed demo range." });
    }

    const instance = getRazorpay();
    const order = await instance.orders.create({
      amount,
      currency: "INR",
      receipt: `us_${Date.now()}`,
      notes: {
        customer_name: customerName.slice(0, 100),
        customer_phone: `${customer.countryCode}${customer.phone}`,
        sample_pricing: "true",
        item_count: String(normalized.reduce((sum, item) => sum + item.quantity, 0)),
        checkout: "ular_suvai_test_checkout"
      }
    });

    cleanExpiredOrders();
    pendingOrders.set(order.id, {
      amount: order.amount,
      currency: order.currency,
      createdAt: Date.now()
    });

    // Key ID is public and required by Checkout.js; Key Secret never leaves this server.
    res.json({ keyId: KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency });
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

    // Verify only order IDs that this server created and stored.
    cleanExpiredOrders();
    const pendingOrder = pendingOrders.get(razorpay_order_id);
    if (!pendingOrder) {
      return res.status(400).json({ verified: false, error: "This checkout order is not valid or has expired. Please create a new order." });
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
    const [payment, order] = await Promise.all([
      razorpay.payments.fetch(razorpay_payment_id),
      razorpay.orders.fetch(razorpay_order_id)
    ]);

    if (
      payment.order_id !== razorpay_order_id ||
      payment.currency !== pendingOrder.currency ||
      order.currency !== pendingOrder.currency ||
      payment.amount !== pendingOrder.amount ||
      order.amount !== pendingOrder.amount ||
      payment.amount_captured !== pendingOrder.amount ||
      payment.status !== "captured" ||
      order.status !== "paid"
    ) {
      return res.status(409).json({
        verified: false,
        error: "Payment is not captured or its amount does not match the Razorpay order. Check Test Mode payment capture settings and try again."
      });
    }

    pendingOrders.delete(razorpay_order_id);
    res.json({
      verified: true,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ular Suvai Razorpay Test API listening on ${PORT}; test credentials configured: ${Boolean(KEY_ID && KEY_SECRET && isTestKey)}`);
});
