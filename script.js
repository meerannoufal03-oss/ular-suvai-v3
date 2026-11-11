// ULAR SUVAI - NAVIGATION, CART AND DEMO CHECKOUT
// Demo only: no real payment or order submission is connected.

const menuToggle=document.getElementById("menu-toggle");
const navbar=document.getElementById("navbar");
const header=document.getElementById("header");

if(menuToggle&&navbar){menuToggle.addEventListener("click",()=>{
    const isOpen=navbar.classList.toggle("active");
    menuToggle.setAttribute("aria-expanded",String(isOpen));
    menuToggle.setAttribute("aria-label",isOpen?"Close Menu":"Open Menu");
    const icon=menuToggle.querySelector("i");
    if(isOpen){icon?.classList.remove("fa-bars");icon?.classList.add("fa-xmark");}
    else{icon?.classList.add("fa-bars");icon?.classList.remove("fa-xmark");}
});}
document.querySelectorAll(".nav-link").forEach(link=>link.addEventListener("click",closeMobileMenu));
function closeMobileMenu(){
    if(!navbar||!menuToggle)return;
    navbar.classList.remove("active");
    menuToggle.setAttribute("aria-expanded","false");
    menuToggle.setAttribute("aria-label","Open Menu");
    const icon=menuToggle.querySelector("i");
    icon?.classList.add("fa-bars");
    icon?.classList.remove("fa-xmark");
}
function updateHeader(){
    header?.classList.toggle("scrolled",window.scrollY>50);
    if(window.innerWidth<=992&&navbar?.classList.contains("active"))closeMobileMenu();
}
window.addEventListener("scroll",updateHeader,{passive:true});updateHeader();
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener("click",event=>{
    const selector=link.getAttribute("href");
    if(!selector||selector==="#")return;
    const target=document.querySelector(selector);if(!target)return;
    event.preventDefault();
    const top=target.getBoundingClientRect().top+window.scrollY-(header?.offsetHeight||0);
    window.scrollTo({top,behavior:"smooth"});
}));
const backToTop=document.getElementById("backToTop");
window.addEventListener("scroll",()=>backToTop?.classList.toggle("show",window.scrollY>500));
backToTop?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
window.addEventListener("resize",()=>{
    if(window.innerWidth>992&&navbar)closeMobileMenu();
});
document.querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{
    img.classList.add("image-error");img.alt="Ular Suvai Product Image";
}));

const STORAGE_KEY="ularSuvaiDemoCart";
let cart=[];
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(saved))cart=saved;}catch(error){cart=[];}
const cartToggle=document.getElementById("cart-toggle");
const cartOverlay=document.getElementById("cart-overlay");
const cartClose=document.getElementById("cart-close");
const cartItems=document.getElementById("cart-items");
const cartCount=document.getElementById("cart-count");
const checkoutForm=document.getElementById("checkout-form");
const checkoutSuccess=document.getElementById("checkout-success");
const continueShopping=document.getElementById("continue-shopping");
const cartSummary=document.getElementById("cart-summary");

function saveCart(){localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}
function openCart(){cartOverlay?.classList.add("is-open");cartOverlay?.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";}
function closeCart(){cartOverlay?.classList.remove("is-open");cartOverlay?.setAttribute("aria-hidden","true");document.body.style.overflow="";}
function updateCartCount(){const count=cart.reduce((sum,item)=>sum+item.quantity,0);if(cartCount)cartCount.textContent=String(count);}
function renderCart(){
    if(!cartItems)return;
    updateCartCount();
    if(cart.length===0){cartItems.innerHTML='<p class="cart-empty">Your cart is empty. Add a product to get started.</p>';
        if(checkoutForm)checkoutForm.hidden=true;if(cartSummary)cartSummary.hidden=true;return;}
    if(checkoutForm)checkoutForm.hidden=false;if(cartSummary)cartSummary.hidden=false;
    cartItems.innerHTML=cart.map(item=>`<article class="cart-line" data-product-id="${item.id}">
        ${item.image ? `<img src="${item.image}" alt="">` : '<div class="cart-line-placeholder" aria-hidden="true"><i class="fa-solid fa-fish"></i></div>'}<div><h4>${item.name}</h4><p>Price to be confirmed</p>
        <div class="cart-quantity"><button type="button" data-cart-action="decrease" aria-label="Decrease quantity">−</button>
        <span>${item.quantity}</span><button type="button" data-cart-action="increase" aria-label="Increase quantity">+</button></div></div>
        <button type="button" class="cart-remove" data-cart-action="remove">Remove</button></article>`).join("");
}
function addToCart(card){
    const name=card.querySelector("h3")?.textContent.trim();if(!name)return;
    const description=card.querySelector(".product-info p")?.textContent.trim()||"";
    const image=card.querySelector(".product-image img")?.getAttribute("src")||"";
    const id=name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
    const existing=cart.find(item=>item.id===id);
    if(existing)existing.quantity+=1;else cart.push({id,name,description,image,quantity:1});
    saveCart();renderCart();openCart();
}
document.querySelectorAll(".product-card").forEach(card=>{
    const info=card.querySelector(".product-info");if(!info||info.querySelector(".add-to-cart-btn"))return;
    const button=document.createElement("button");button.type="button";button.className="add-to-cart-btn";
    button.innerHTML='<i class="fa-solid fa-cart-plus"></i> Add to Cart';
    button.addEventListener("click",()=>addToCart(card));info.appendChild(button);
});
cartItems?.addEventListener("click",event=>{
    const button=event.target.closest("[data-cart-action]");if(!button)return;
    const line=button.closest("[data-product-id]");const item=cart.find(entry=>entry.id===line?.dataset.productId);if(!item)return;
    const action=button.dataset.cartAction;
    if(action==="increase")item.quantity+=1;
    if(action==="decrease")item.quantity-=1;
    if(action==="remove"||item.quantity<=0)cart=cart.filter(entry=>entry.id!==item.id);
    saveCart();renderCart();
});
cartToggle?.addEventListener("click",()=>{closeMobileMenu();openCart();});cartClose?.addEventListener("click",closeCart);
cartOverlay?.addEventListener("click",event=>{if(event.target===cartOverlay)closeCart();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCart();});
checkoutForm?.addEventListener("submit",event=>{
    event.preventDefault();if(cart.length===0||!checkoutForm.reportValidity())return;
    const name=document.getElementById("customer-name").value.trim();
    const count=cart.reduce((sum,item)=>sum+item.quantity,0);
    checkoutForm.hidden=true;if(cartSummary)cartSummary.hidden=true;cartItems.hidden=true;checkoutSuccess.hidden=false;
    document.getElementById("success-message").textContent=`Thank you, ${name}. Your demo checkout includes ${count} item(s). No real order was sent and no payment was collected.`;
    cart=[];saveCart();updateCartCount();
});
continueShopping?.addEventListener("click",()=>{
    checkoutSuccess.hidden=true;cartItems.hidden=false;checkoutForm.reset();renderCart();closeCart();
});
renderCart();
console.log("Ular Suvai demo cart loaded.");
