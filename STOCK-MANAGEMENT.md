# UlarSuvai — owner-managed product stock

The storefront and Razorpay order API read stock from `inventory.json`.

- `true` means **In Stock**. Add to Cart is enabled.
- `false` means **Out of Stock**. Add to Cart is disabled and the order API rejects the item.
- Only people with edit access to this GitHub repository can change this file. Customers cannot change stock on the public website.

## Change stock for a product

1. Open `inventory.json` in GitHub.
2. Click the pencil icon (**Edit this file**).
3. Find the exact product name.
4. Change `true` to `false` when the item is unavailable, or `false` to `true` when stock returns.
5. Commit the change to `main`.

Example:

```json
"pickles:Chicken Oorugai": false,
"pickles:Beef Oorugai": true,
```

The public page reads the new file after GitHub Pages updates. The Razorpay API refreshes the same source every 15 seconds.

**Important:** A true in-site admin dropdown with owner login requires a secured authentication system and persistent database. This file-based workflow is restricted to GitHub repository editors; customers cannot edit stock.