import express from "express";
import Razorpay from "razorpay";
import crypto from "node:crypto";

const app = express();
app.use(express.json({ limit: "32kb" }));

const PORT = process.env.PORT || 3000;
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://meerannoufal03-oss.github.io";
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === FRONTEND_ORIGIN || origin === "http://127.0.0.1:5500" || origin === "http://localhost:5500") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET) {
    const error = new Error("Razorpay Test Mode keys are not configured on the server.");
    error.status = 503;
    throw error;
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}
function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  console.error("Payment API error:", error.message);
  res.status(status).json({ error: status === 500 ? "Payment service error. Please try again." : error.message });
}
const SAMPLE_PRICES = Object.freeze({
  pickles: 15000,       // INR paise
  "palm-products": 8000,
  uppukandam: 22000,
  karuvadu: 12000
});
const ALLOWED_COUNTRY_CODES = new Set(["+91","+1","+44","+971","+966","+974","+965","+968","+973","+94","+60","+65","+61"]);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, paymentProvider: "Razorpay", mode: "test", configured: Boolean(KEY_ID && KEY_SECRET) });
});

app.post("/api/create-order", async (req, res) => {
  try {
    const { items, customer } = req.body || {};
    if (!Array.isArray(items) || items.length < 1 || items.length > 40) {
      return res.status(400).json({ error: "Cart items are invalid." });
    }
    if (!customer || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(String(customer.name || ""))) {
      return res.status(400).json({ error: "Enter a valid name using English letters only." });
    }
    if (!ALLOWED_COUNTRY_CODES.has(customer.countryCode) || !/^\d{10}$/.test(String(customer.phone || ""))) {
      return res.status(400).json({ error: "Select a country code and enter a 10-digit phone number." });
    }
    if (!String(customer.address || "").trim() || String(customer.address).length > 500) {
      return res.status(400).json({ error: "Enter a valid delivery address." });
    }

    // Always calculate prices on the server; never trust totals sent by the browser.
    const normalized = items.map(item => {
      const category = String(item.category || "");
      const price = SAMPLE_PRICES[category];
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !price) {
        throw Object.assign(new Error("Cart contains an invalid item or quantity."), { status: 400 });
      }
      return { category, name: String(item.name || "").slice(0, 100), quantity, price };
    });
    const amount = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (amount < 100 || amount > 5000000) {
      return res.status(400).json({ error: "Order amount is outside the allowed demo range." });
    }

    const instance = getRazorpay();
    const order = await instance.orders.create({
      amount,
      currency: "INR",
      receipt: `us_${Date.now()}`,
      notes: {
        customer_name: String(customer.name).slice(0, 100),
        customer_phone: `${customer.countryCode}${customer.phone}`,
        sample_pricing: "true",
        checkout: "razorpay_standard_checkout"
      }
    });
    res.json({ keyId: KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(value => typeof value === "string" && value.length > 0)) {
      return res.status(400).json({ error: "Payment verification details are missing." });
    }
    const expected = crypto.createHmac("sha256", KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(razorpay_signature);
    if (!KEY_SECRET || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ verified: false, error: "Payment signature verification failed." });
    }
    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || !["authorized", "captured"].includes(payment.status)) {
      return res.status(400).json({ verified: false, error: "Payment is not in a valid state." });
    }
    res.json({ verified: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    sendError(res, error);
  }
});

app.listen(PORT, () => console.log(`Ular Suvai Razorpay Test API listening on ${PORT}`));
