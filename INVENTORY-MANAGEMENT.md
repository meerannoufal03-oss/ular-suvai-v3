# UlarSuvai inventory settings

All existing catalogue products are **In Stock** by default.

The public product page intentionally does not include an editable stock dropdown. A stock dropdown available to every visitor would let customers change the availability shown in their own browser and could be used to try ordering unavailable products. Until a secured admin login and shared inventory database are added, availability is controlled in the website/API configuration.

## Mark one product Out of Stock

Add the exact category and product name to the `OUT_OF_STOCK_PRODUCTS` set in **both** `script.js` and `server.js`.

Examples:

```js
const OUT_OF_STOCK_PRODUCTS = new Set([
  "pickles:Chicken Oorugai",
  "karuvadu:Sala",
  "palm-products:Karupatti",
]);
```

The supported category keys are `pickles`, `palm-products`, `uppukandam`, and `karuvadu`.

Remove a line from both sets when the product is back in stock. Commit and push the changes to the website branch and payment API branch so that the public page and server use the same inventory status.

**Important:** Prices currently shown are sample/demo prices: Pickles ₹150, Palm Products ₹80, Uppukandam ₹220 and Karuvadu ₹120 per 500g. Replace them with approved selling prices before accepting real customer payments.
