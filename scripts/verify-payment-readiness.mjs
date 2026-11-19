import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [server, storefront, html, inventoryText, envExample] = await Promise.all([
  read("server.js"),
  read("script.js"),
  read("index.html"),
  read("inventory.json"),
  read(".env.example")
]);
const inventory = JSON.parse(inventoryText);
const failures = [];
const passed = [];

function check(condition, message) {
  (condition ? passed : failures).push(message);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const apiMatch = storefront.match(/const PAYMENT_API_BASE=window\.ULAR_SUVAI_PAYMENT_API \|\| "([^"]+)"/);
check(apiMatch?.[1] === "https://ular-suvai-razorpay-test-api.onrender.com",
  "Storefront points to the configured Ular Suvai Render payment API.");

check(server.includes('const DEFAULT_FRONTEND_ORIGIN = "https://meerannoufal03-oss.github.io";'),
  "Backend default CORS origin matches the GitHub Pages hostname.");

check(server.includes('https://raw.githubusercontent.com/meerannoufal03-oss/ular-suvai-v3/main/inventory.json'),
  "Backend inventory source is the GitHub Pages main-branch inventory file.");

check(html.includes('id="payment-mode-status"') && html.includes('script.js?v=20261119-payment-readiness-1'),
  "Storefront displays payment mode and uses a cache-busted checkout script.");

check(server.includes('LIVE_PAYMENTS_ENABLED = process.env.LIVE_PAYMENTS_ENABLED === "true"') &&
      server.includes('LIVE_PRICES_CONFIRMED = process.env.LIVE_PRICES_CONFIRMED === "true"') &&
      server.includes("!LIVE_PAYMENTS_ENABLED || !LIVE_PRICES_CONFIRMED"),
  "Live checkout requires both explicit safety flags.");

check(server.includes('originalOrder.currency !== "INR"') &&
      server.includes('order.currency !== "INR"') &&
      server.includes("!Number.isSafeInteger(expectedAmount)") &&
      server.includes("payment.amount !== expectedAmount"),
  "Payment verification checks INR currency and exact safe integer amount.");

check(!server.includes("originalOrder.currency !== originalOrder.currency") &&
      !server.includes("originalOrder.amount !== originalOrder.amount"),
  "No tautological self-comparisons remain in payment verification.");

check(server.includes('res.setHeader("Cache-Control", "no-store")') &&
      server.includes("livePaymentsEnabled: LIVE_PAYMENTS_ENABLED"),
  "Health response is non-cacheable and reports the Live safety flag.");

check(envExample.includes("LIVE_PAYMENTS_ENABLED=false") &&
      envExample.includes("LIVE_PRICES_CONFIRMED=false"),
  "Example environment keeps both Live checkout safety flags OFF.");

const frontPrices = storefront.match(/const CATEGORY_SAMPLE_PACKS=\{([\s\S]*?)\n\};/)?.[1] ?? "";
const backPrices = server.match(/const SAMPLE_PRICES = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] ?? "";
const categories = ["pickles", "palm-products", "uppukandam", "karuvadu"];
let pricesMatch = Boolean(frontPrices && backPrices);
for (const category of categories) {
  const fr = new RegExp(escapeRegExp(category) + "[\\\"\\\']?\\s*:\\s*\\{\\s*price:\\s*(\\d+)", "m").exec(frontPrices);
  const br = new RegExp(escapeRegExp(category) + "[\\\"\\\']?\\s*:\\s*(\\d+)", "m").exec(backPrices);
  if (!fr || !br || Number(fr[1]) * 100 !== Number(br[1])) pricesMatch = false;
}
check(pricesMatch, "Displayed sample prices and backend charge amounts match for all four categories.");

const productMap = inventory?.products;
check(Boolean(productMap && typeof productMap === "object" && Object.keys(productMap).length > 0 &&
  Object.values(productMap).every(value => typeof value === "boolean")),
  "Inventory JSON is valid and every product has an explicit boolean stock value.");

for (const path of ["server.js", "script.js"]) {
  const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  check(result.status === 0, path + " passes Node.js syntax checking." +
    (result.status === 0 ? "" : " " + (result.stderr || result.stdout || "").trim()));
}

for (const message of passed) console.log("PASS  " + message);
for (const message of failures) console.error("FAIL  " + message);
console.log("\n" + passed.length + " checks passed; " + failures.length + " failed.");
if (failures.length) process.exitCode = 1;
