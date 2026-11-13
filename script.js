// ULAR SUVAI - NAVIGATION, CART AND TWO-STEP DEMO CHECKOUT
// Temporary category-wise sample prices only. Replace with approved prices later.
const CATEGORY_SAMPLE_PACKS={
 pickles:{price:150,weight:"500g"},
 "palm-products":{price:80,weight:"500g"},
 uppukandam:{price:220,weight:"500g"},
 karuvadu:{price:120,weight:"500g"}
};
const PAYMENT_API_BASE=window.ULAR_SUVAI_PAYMENT_API || "https://ular-suvai-razorpay-test-api.onrender.com";
// Product stock is maintained by the owner in inventory.json.
// Only GitHub repository collaborators can edit this file; customers cannot change stock.
let INVENTORY_PRODUCTS = Object.create(null);
let INVENTORY_READY = false;
async function loadInventory() {
  const inventoryUrl = new URL("./inventory.json", window.location.href);
  inventoryUrl.searchParams.set("_", String(Date.now()));
  const response = await fetch(inventoryUrl.toString(), { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load product stock settings.");
  const data = await response.json();
  if (!data || !data.products || typeof data.products !== "object") throw new Error("Product stock settings are invalid.");
  INVENTORY_PRODUCTS = data.products;
  INVENTORY_READY = true;
}
function isProductInStock(category, name) {
  return INVENTORY_READY && INVENTORY_PRODUCTS[category + ":" + name] === true;
}
const STORAGE_KEY="ularSuvaiCartNov2026"; // new stock-aware cart version; old demo cart is intentionally not carried forward
function samplePackFor(card){const section=card.closest("section[id]");return CATEGORY_SAMPLE_PACKS[section?.id]||{price:100,weight:"500g"};}
const menuToggle=document.getElementById("menu-toggle"),navbar=document.getElementById("navbar"),header=document.getElementById("header");
function closeMobileMenu(){if(!navbar||!menuToggle)return;navbar.classList.remove("active");menuToggle.setAttribute("aria-expanded","false");menuToggle.setAttribute("aria-label","Open Menu");const icon=menuToggle.querySelector("i");icon?.classList.add("fa-bars");icon?.classList.remove("fa-xmark");}
menuToggle?.addEventListener("click",()=>{const open=navbar?.classList.toggle("active")||false;menuToggle.setAttribute("aria-expanded",String(open));menuToggle.setAttribute("aria-label",open?"Close Menu":"Open Menu");const icon=menuToggle.querySelector("i");if(open){icon?.classList.remove("fa-bars");icon?.classList.add("fa-xmark");}else{icon?.classList.add("fa-bars");icon?.classList.remove("fa-xmark");}});
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",closeMobileMenu));
function updateHeader(){header?.classList.toggle("scrolled",window.scrollY>50);if(window.innerWidth<=992&&navbar?.classList.contains("active"))closeMobileMenu();}
window.addEventListener("scroll",updateHeader,{passive:true});updateHeader();
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{const sel=a.getAttribute("href");if(!sel||sel==="#")return;const target=document.querySelector(sel);if(!target)return;e.preventDefault();window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-(header?.offsetHeight||0),behavior:"smooth"});}));
const backToTop=document.getElementById("backToTop");window.addEventListener("scroll",()=>backToTop?.classList.toggle("show",window.scrollY>500));backToTop?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));window.addEventListener("resize",()=>{if(window.innerWidth>992)closeMobileMenu();});
document.querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.classList.add("image-error");img.alt="Ular Suvai Product Image";}));
let cart=[];try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(data))cart=data.filter(x=>x&&x.id&&x.name).map(x=>{const card=[...document.querySelectorAll(".product-card")].find(c=>c.querySelector("h3")?.textContent.trim()===x.name);const category=card?.closest("section[id]")?.id||x.category||"pickles";const pack=CATEGORY_SAMPLE_PACKS[category]||{price:Number(x.price)||100,weight:x.weight||"500g"};return {...x,quantity:Math.max(1,Number(x.quantity)||1),price:pack.price,weight:pack.weight,category};});}catch(e){cart=[];}
const cartToggle=document.getElementById("cart-toggle"),cartOverlay=document.getElementById("cart-overlay"),cartClose=document.getElementById("cart-close"),cartItems=document.getElementById("cart-items"),cartCount=document.getElementById("cart-count"),checkoutForm=document.getElementById("checkout-form"),checkoutSuccess=document.getElementById("checkout-success"),continueShopping=document.getElementById("continue-shopping"),cartSummary=document.getElementById("cart-summary"),cartTotal=document.getElementById("cart-total"),cartStep=document.getElementById("cart-step"),checkoutStep=document.getElementById("checkout-step"),checkoutNext=document.getElementById("checkout-next"),backToCart=document.getElementById("back-to-cart");
function saveCart(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}catch(e){console.warn("Could not save cart",e);}}
function openCart(){cartOverlay?.classList.add("is-open");cartOverlay?.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";}
function closeCart(){cartOverlay?.classList.remove("is-open");cartOverlay?.setAttribute("aria-hidden","true");document.body.style.overflow="";}
function showCartStep(){if(cartStep)cartStep.hidden=false;if(checkoutStep)checkoutStep.hidden=true;if(checkoutSuccess)checkoutSuccess.hidden=true;const title=document.getElementById("cart-title");if(title)title.textContent="Your Shopping Cart";}
function showCheckoutStep(){if(!cart.length)return;if(cartStep)cartStep.hidden=true;if(checkoutStep)checkoutStep.hidden=false;if(checkoutSuccess)checkoutSuccess.hidden=true;const title=document.getElementById("cart-title");if(title)title.textContent="Delivery & Payment";checkoutStep?.scrollTo({top:0,behavior:"smooth"});}
function updateCount(){if(cartCount)cartCount.textContent=String(cart.reduce((n,x)=>n+x.quantity,0));}
function renderCart(){if(!cartItems)return;updateCount();const total=cart.reduce((n,x)=>n+x.price*x.quantity,0);if(cartTotal)cartTotal.textContent="₹"+total.toFixed(2);if(checkoutNext)checkoutNext.disabled=!cart.length;if(!cart.length){cartItems.innerHTML='<p class="cart-empty">Your cart is empty. Add a product to get started.</p>';if(cartSummary)cartSummary.hidden=true;return;}if(cartSummary)cartSummary.hidden=false;cartItems.innerHTML=cart.map(x=>`<article class="cart-line" data-product-id="${x.id}">${x.image?`<img src="${x.image}" alt="">`:'<div class="cart-line-placeholder"><i class="fa-solid fa-fish"></i></div>'}<div><h4>${x.name}</h4><p>${x.description||""}</p><p class="cart-item-price">Price: ₹${x.price} / ${x.weight||"500g"}</p><div class="cart-quantity"><button type="button" data-cart-action="decrease" aria-label="Decrease quantity">−</button><span>${x.quantity}</span><button type="button" data-cart-action="increase" aria-label="Increase quantity">+</button></div></div><button type="button" class="cart-remove" data-cart-action="remove">Remove</button></article>`).join("");}
function addToCart(card){
 const name=card.querySelector("h3")?.textContent.trim();
 if(!name)return;
 const category=card.closest("section[id]")?.id||"pickles";
 if(!isProductInStock(category,name))return;
 const description=card.querySelector(".product-info p")?.textContent.trim()||"";
 const image=card.querySelector(".product-image img")?.getAttribute("src")||"";
 const id=name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
 const pack=samplePackFor(card);
 const existing=cart.find(x=>x.id===id);
 if(existing){existing.quantity++;existing.price=pack.price;existing.weight=pack.weight;existing.category=category;}
 else cart.push({id,name,description,image,quantity:1,price:pack.price,weight:pack.weight,category});
 saveCart();showCartStep();renderCart();openCart();
}

function renderProductCards() {
document.querySelectorAll(".product-card").forEach(card=>{
 const info=card.querySelector(".product-info"),heading=info?.querySelector("h3");
 if(!info||!heading)return;
 const name=heading.textContent.trim();
 const category=card.closest("section[id]")?.id||"pickles";
 const inStock=isProductInStock(category,name);
 const pack=samplePackFor(card);
 const image=card.querySelector(".product-image");

 let meta=info.querySelector(".product-meta");
 if(!meta){meta=document.createElement("div");meta.className="product-meta";info.appendChild(meta);}
 let price=meta.querySelector(".sample-price");
 if(!price){price=document.createElement("p");price.className="sample-price";meta.appendChild(price);}
 price.textContent="₹"+pack.price+" / "+pack.weight;

 let badge=info.querySelector(".stock-badge")||image?.querySelector(".stock-badge");
 if(!badge){badge=document.createElement("span");badge.className="stock-badge"; }
 badge.textContent=inStock?"In Stock":"Out of Stock";
 badge.classList.toggle("is-in-stock",inStock);
 badge.classList.toggle("is-out-of-stock",!inStock);
 meta.appendChild(badge);
 card.dataset.stock=inStock?"in-stock":"out-of-stock";

 let button=info.querySelector(".add-to-cart-btn");
 if(!button){button=document.createElement("button");button.type="button";button.className="add-to-cart-btn";info.appendChild(button);}
 if(inStock){
   button.disabled=false;
   button.removeAttribute("aria-disabled");
   button.title="Add product to cart";
   button.innerHTML='<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Add to Cart';
   button.onclick=()=>addToCart(card);
 }else{
   button.disabled=true;
   button.setAttribute("aria-disabled","true");
   button.title="This product is currently unavailable";
   button.innerHTML='<i class="fa-solid fa-ban" aria-hidden="true"></i> Out of Stock';
   button.onclick=null;
 }
});
}

cartItems?.addEventListener("click",e=>{const b=e.target.closest("[data-cart-action]");if(!b)return;const line=b.closest("[data-product-id]"),item=cart.find(x=>x.id===line?.dataset.productId);if(!item)return;if(b.dataset.cartAction==="increase")item.quantity++;if(b.dataset.cartAction==="decrease")item.quantity--;if(b.dataset.cartAction==="remove"||item.quantity<=0)cart=cart.filter(x=>x.id!==item.id);saveCart();renderCart();});
cartToggle?.addEventListener("click",()=>{closeMobileMenu();showCartStep();renderCart();openCart();});cartClose?.addEventListener("click",closeCart);cartOverlay?.addEventListener("click",e=>{if(e.target===cartOverlay)closeCart();});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCart();});
checkoutNext?.addEventListener("click",showCheckoutStep);backToCart?.addEventListener("click",()=>{showCartStep();renderCart();});
const customerName=document.getElementById("customer-name");
customerName?.addEventListener("input",()=>{
 const cleaned=customerName.value.replace(/[^A-Za-z ]/g,"").replace(/ {2,}/g," ");
 if(cleaned!==customerName.value)customerName.value=cleaned;
});
customerName?.addEventListener("blur",()=>{
 customerName.value=customerName.value.trim().replace(/ +/g," ");
});
const customerPhone=document.getElementById("customer-phone");customerPhone?.addEventListener("input",()=>{const v=customerPhone.value.replace(/\D/g,"").slice(0,10);if(v!==customerPhone.value)customerPhone.value=v;});
checkoutForm?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!cart.length||!checkoutForm.reportValidity())return;
 const button=document.getElementById("razorpay-pay-button");
 const original=button.innerHTML;
 const items=cart.map(item=>({name:item.name,quantity:item.quantity,category:item.category}));
 const addressParts = ["customer-house","customer-street","customer-area","customer-city","customer-pincode"].map(id=>document.getElementById(id)?.value.trim()||"");
 if(addressParts.some(part=>!part)){alert("Please complete all delivery address fields.");return;}
 const customer={name:customerName.value.trim(),countryCode:document.getElementById("country-code").value,phone:customerPhone.value,address:addressParts.join(", ")};
 button.disabled=true;button.textContent="Connecting to Razorpay...";
 try {
  const response=await fetch(PAYMENT_API_BASE+"/api/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items,customer})});
  const order=await response.json();if(!response.ok)throw new Error(order.error||"Could not create Razorpay order.");
  if(!window.Razorpay)throw new Error("Razorpay Checkout did not load. Refresh and try again.");
  const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Ular Suvai",description:"Ular Suvai Test Order",order_id:order.orderId,prefill:{name:customer.name,contact:customer.phone},theme:{color:"#74350b"},
   handler:async result=>{
    try{
     const verify=await fetch(PAYMENT_API_BASE+"/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)});
     const checked=await verify.json();if(!verify.ok||!checked.verified)throw new Error(checked.error||"Payment verification failed.");
     checkoutStep.hidden=true;checkoutSuccess.hidden=false;
     document.getElementById("success-message").textContent="Test payment verified successfully. Payment ID: "+checked.paymentId+". This was a Razorpay Test Mode transaction; no real money was collected.";
     cart=[];saveCart();updateCount();
    }catch(err){alert(err.message);}
    finally{button.disabled=false;button.innerHTML=original;}
   },
   modal:{ondismiss:()=>{button.disabled=false;button.innerHTML=original;}}
  });
  checkout.on("payment.failed",failure=>{alert(failure.error?.description||"Test payment failed. Please try again.");button.disabled=false;button.innerHTML=original;});
  checkout.open();
 }catch(error){alert(error.message);button.disabled=false;button.innerHTML=original;}
});
continueShopping?.addEventListener("click",()=>{checkoutForm.reset();showCartStep();renderCart();closeCart();});
async function initialiseStorefront() {
 try {
  await loadInventory();
  cart = cart.filter(item => isProductInStock(item.category || "pickles", item.name));
  saveCart();
  renderProductCards();
 } catch (error) {
  INVENTORY_READY = false;
  console.error("Inventory unavailable. Add to Cart is disabled until stock settings load.", error);
  document.querySelectorAll(".product-card").forEach(card => {
   const info=card.querySelector(".product-info"); if(!info)return;
   card.dataset.stock="out-of-stock";
   let badge=info.querySelector(".stock-badge");
   if(!badge){badge=document.createElement("span");badge.className="stock-badge";info.appendChild(badge);}
   badge.textContent="Stock unavailable";
   let button=info.querySelector(".add-to-cart-btn");
   if(!button){button=document.createElement("button");button.type="button";button.className="add-to-cart-btn";info.appendChild(button);}
   button.disabled=true;button.textContent="Unavailable";
  });
 }
 renderCart();
 showCartStep();
 console.log("Ular Suvai storefront initialised with owner-managed inventory.");
}
initialiseStorefront();
