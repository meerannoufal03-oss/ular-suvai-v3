// =========================================================
// ULAR SUVAI
// JAVASCRIPT - PART 6
// =========================================================


// =========================================================
// MOBILE NAVIGATION
// =========================================================

const menuToggle = document.getElementById("menu-toggle");
const navbar = document.getElementById("navbar");

if (menuToggle && navbar) {

    menuToggle.addEventListener("click", () => {

        navbar.classList.toggle("active");

        const icon = menuToggle.querySelector("i");

        if (navbar.classList.contains("active")) {

            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");

        } else {

            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");

        }

    });

}


// =========================================================
// CLOSE MOBILE MENU WHEN CLICKING NAV LINK
// =========================================================

const navLinks = document.querySelectorAll(".nav-link");

navLinks.forEach((link) => {

    link.addEventListener("click", () => {

        if (navbar) {
            navbar.classList.remove("active");
        }

        if (menuToggle) {

            const icon = menuToggle.querySelector("i");

            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");

        }

    });

});


// =========================================================
// HEADER SCROLL EFFECT
// =========================================================

const header = document.getElementById("header");

function updateHeader() {

    if (!header) return;

    if (window.scrollY > 50) {

        header.classList.add("scrolled");

    } else {

        header.classList.remove("scrolled");

    }

}

window.addEventListener("scroll", updateHeader);

updateHeader();


// =========================================================
// ACTIVE NAVIGATION LINK
// =========================================================

const sections = document.querySelectorAll("section[id]");

function updateActiveLink() {

    const scrollPosition = window.scrollY + 150;

    sections.forEach((section) => {

        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute("id");

        if (
            scrollPosition >= sectionTop &&
            scrollPosition < sectionTop + sectionHeight
        ) {

            navLinks.forEach((link) => {

                link.classList.remove("active");

                if (
                    link.getAttribute("href") ===
                    "#" + sectionId
                ) {

                    link.classList.add("active");

                }

            });

        }

    });

}

window.addEventListener("scroll", updateActiveLink);


// =========================================================
// BACK TO TOP BUTTON
// =========================================================

const backToTop = document.getElementById("backToTop");

function updateBackToTop() {

    if (!backToTop) return;

    if (window.scrollY > 500) {

        backToTop.classList.add("show");

    } else {

        backToTop.classList.remove("show");

    }

}

window.addEventListener("scroll", updateBackToTop);


if (backToTop) {

    backToTop.addEventListener("click", () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}


// =========================================================
// SMOOTH SCROLL FOR INTERNAL LINKS
// =========================================================

const internalLinks = document.querySelectorAll(
    'a[href^="#"]'
);

internalLinks.forEach((link) => {

    link.addEventListener("click", function (event) {

        const targetId = this.getAttribute("href");

        if (
            targetId === "#" ||
            !targetId
        ) {
            return;
        }

        const target = document.querySelector(targetId);

        if (!target) {
            return;
        }

        event.preventDefault();

        const headerHeight = header
            ? header.offsetHeight
            : 0;

        const targetPosition =
            target.getBoundingClientRect().top +
            window.scrollY -
            headerHeight;

        window.scrollTo({

            top: targetPosition,

            behavior: "smooth"

        });

    });

});


// =========================================================
// PREVENT EMPTY SOCIAL LINKS FROM JUMPING
// =========================================================

const emptyLinks = document.querySelectorAll(
    'a[href="#"]'
);

emptyLinks.forEach((link) => {

    link.addEventListener("click", (event) => {

        event.preventDefault();

    });

});


// =========================================================
// WINDOW RESIZE
// =========================================================

window.addEventListener("resize", () => {

    if (
        window.innerWidth > 992 &&
        navbar
    ) {

        navbar.classList.remove("active");

        if (menuToggle) {

            const icon =
                menuToggle.querySelector("i");

            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");

        }

    }

});

// =========================================================
// ULAR SUVAI
// SEARCH + PRODUCT INTERACTION - PART 7
// =========================================================


// =========================================================
// SEARCH ELEMENTS
// =========================================================

const searchButton = document.querySelector(
    '.nav-icon-btn[aria-label="Search"]'
);

const productCards = document.querySelectorAll(
    ".product-card"
);


// =========================================================
// CREATE SEARCH BOX
// =========================================================

if (searchButton) {

    const searchBox = document.createElement("div");

    searchBox.className = "search-box";

    searchBox.innerHTML = `
        <div class="search-box-inner">

            <div class="search-input-wrapper">

                <i class="fa-solid fa-magnifying-glass"></i>

                <input
                    type="text"
                    id="productSearch"
                    placeholder="Search products..."
                    autocomplete="off"
                >

                <button
                    type="button"
                    id="closeSearch"
                    aria-label="Close Search"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>


        </div>
    `;

    document.body.appendChild(searchBox);


    // =====================================================
    // OPEN SEARCH
    // =====================================================

    searchButton.addEventListener("click", () => {

        searchBox.classList.add("active");

        const input =
            document.getElementById("productSearch");

        if (input) {
            setTimeout(() => {
                input.focus();
            }, 200);
        }

    });


    // =====================================================
    // CLOSE SEARCH
    // =====================================================

    const closeSearch =
        document.getElementById("closeSearch");

    if (closeSearch) {

        closeSearch.addEventListener("click", () => {

            searchBox.classList.remove("active");

            const input =
                document.getElementById("productSearch");

            if (input) {
                input.value = "";
            }

            productCards.forEach((card) => {

                card.style.display = "";

            });

        });

    }


    // =====================================================
    // SEARCH PRODUCTS
    // =====================================================

    const searchInput =
        document.getElementById("productSearch");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                const searchValue =
                    searchInput.value
                        .toLowerCase()
                        .trim();

                let foundProducts = 0;


                productCards.forEach((card) => {

                    const productName =
                        card
                            .querySelector("h3")
                            ?.textContent
                            .toLowerCase() || "";

                    const productDescription =
                        card
                            .querySelector("p")
                            ?.textContent
                            .toLowerCase() || "";


                    const productText =
                        productName +
                        " " +
                        productDescription;


                    if (
                        searchValue === "" ||
                        productText.includes(searchValue)
                    ) {

                        card.style.display = "";

                        foundProducts++;

                    } else {

                        card.style.display = "none";

                    }

                });


                const message =
                    document.getElementById("searchMessage");


                if (message) {

                    if (searchValue === "") {

                        message.textContent =
                            "Search for your favourite product";

                    } else if (foundProducts === 0) {

                        message.textContent =
                            "No products found";

                    } else {

                        message.textContent =
                            foundProducts +
                            " product(s) found";

                    }

                }

            }
        );

    }

}


// =========================================================
// CLOSE SEARCH WHEN ESCAPE IS PRESSED
// =========================================================

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        const searchBox =
            document.querySelector(".search-box");

        if (searchBox) {

            searchBox.classList.remove("active");

        }

    }

});


// =========================================================
// PRODUCT CARD CLICK
// =========================================================

productCards.forEach((card) => {

    card.addEventListener("click", () => {

        const productName =
            card.querySelector("h3")
                ?.textContent
                .trim();


        if (!productName) {
            return;
        }


        // -----------------------------------------------
        // CHANGE THIS NUMBER TO YOUR ACTUAL WHATSAPP NO.
        // -----------------------------------------------

        const whatsappNumber =
            "919XXXXXXXXX";


        const message =
            `Hi Ular Suvai, I am interested in ${productName}. Please share the price and details.`;


        const whatsappURL =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;


        window.open(
            whatsappURL,
            "_blank"
        );

    });

});


// =========================================================
// PRODUCT CARD KEYBOARD ACCESSIBILITY
// =========================================================

productCards.forEach((card) => {

    card.setAttribute(
        "role",
        "button"
    );

    card.setAttribute(
        "tabindex",
        "0"
    );


    card.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                card.click();

            }

        }
    );

});

// =========================================================
// ULAR SUVAI
// FINAL CONNECTION - PART 9
// =========================================================


// =========================================================
// WHATSAPP NUMBER
// =========================================================

// IMPORTANT:
// 91 + mobile number மட்டும்.
// + symbol, spaces use panna vendam.

const ULAR_SUVAI_WHATSAPP = "919XXXXXXXXX";


// =========================================================
// OPEN WHATSAPP ORDER
// =========================================================

function orderOnWhatsApp(productName) {

    if (!productName) return;

    const message =
        `Hi Ular Suvai 👋\n\n` +
        `I am interested in: ${productName}\n\n` +
        `Please share the price and availability.`;

    const whatsappURL =
        `https://wa.me/${ULAR_SUVAI_WHATSAPP}?text=${encodeURIComponent(message)}`;

    window.open(
        whatsappURL,
        "_blank"
    );
}


// =========================================================
// HERO WHATSAPP BUTTON
// =========================================================

const whatsappButtons =
    document.querySelectorAll(
        ".whatsapp-button, .hero .btn-outline"
    );

whatsappButtons.forEach((button) => {

    button.addEventListener("click", (event) => {

        const href =
            button.getAttribute("href");

        // If button already has a real WhatsApp link,
        // don't override it.
        if (
            href &&
            href.includes("wa.me")
        ) {
            return;
        }

        event.preventDefault();

        orderOnWhatsApp(
            "Ular Suvai Products"
        );

    });

});


// =========================================================
// PRODUCT CARDS
// =========================================================

const allProductCards =
    document.querySelectorAll(
        ".product-card"
    );

allProductCards.forEach((card) => {

    const productNameElement =
        card.querySelector("h3");

    if (!productNameElement) return;

    const productName =
        productNameElement.textContent.trim();


    // Remove old click listener issue
    // by adding a separate order button.

    let orderButton =
        card.querySelector(".product-order-btn");


    if (!orderButton) {

        orderButton =
            document.createElement("button");

        orderButton.className =
            "product-order-btn";

        orderButton.innerHTML =
            `<i class="fa-brands fa-whatsapp"></i>
             Order`;

        const productInfo =
            card.querySelector(".product-info");

        if (productInfo) {

            productInfo.appendChild(
                orderButton
            );

        }

    }


    orderButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            orderOnWhatsApp(
                productName
            );

        }
    );

});


// =========================================================
// CATEGORY LINKS
// =========================================================

const categoryLinks =
    document.querySelectorAll(
        ".category-link"
    );

categoryLinks.forEach((link) => {

    link.addEventListener(
        "click",
        (event) => {

            const targetId =
                link.getAttribute("href");

            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }

            const target =
                document.querySelector(
                    targetId
                );

            if (!target) return;

            event.preventDefault();

            const headerHeight =
                header
                    ? header.offsetHeight
                    : 0;

            const targetPosition =
                target.offsetTop -
                headerHeight;

            window.scrollTo({

                top: targetPosition,

                behavior: "smooth"

            });

        }
    );

});


// =========================================================
// IMAGE ERROR FALLBACK
// =========================================================

const allImages =
    document.querySelectorAll(
        "img"
    );

allImages.forEach((image) => {

    image.addEventListener(
        "error",
        () => {

            image.classList.add(
                "image-error"
            );

            image.alt =
                "Ular Suvai Product Image";

        }
    );

});


// =========================================================
// MOBILE MENU - CLOSE AFTER RESIZE
// =========================================================

window.addEventListener(
    "resize",
    () => {

        if (
            window.innerWidth > 992 &&
            navbar
        ) {

            navbar.classList.remove(
                "active"
            );

            if (menuToggle) {

                const icon =
                    menuToggle.querySelector(
                        "i"
                    );

                if (icon) {

                    icon.classList.remove(
                        "fa-xmark"
                    );

                    icon.classList.add(
                        "fa-bars"
                    );

                }

            }

        }

    }
);


// =========================================================
// PREVENT FORM SUBMIT RELOAD
// =========================================================

const forms =
    document.querySelectorAll(
        "form"
    );

forms.forEach((form) => {

    form.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

        }
    );

});


// =========================================================
// PAGE LOADED
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Ular Suvai website loaded successfully."
        );

    }
);

