/* =========================================================
   Gulnish Crochet — interactions
   ========================================================= */

(function () {
  "use strict";

  var GC = window.GC;

  /* ---------- Weak-network / mobile image tier ---------- */
  var LOW_RES =
    (navigator.connection && typeof navigator.connection.effectiveType === "string" &&
      (navigator.connection.effectiveType === "slow-2g" ||
        navigator.connection.effectiveType === "2g" ||
        navigator.connection.effectiveType === "3g")) ||
    window.matchMedia("(max-width: 760px)").matches;
  function displayImage(src) {
    if (!src || !LOW_RES) return src;
    var parts = src.split("/");
    if (parts.length >= 2 && parts[parts.length - 2] !== "sm") {
      parts.splice(parts.length - 1, 0, "sm");
    }
    return parts.join("/");
  }

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      mainNav.classList.toggle("open");
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
      });
    });
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header shadow + scroll progress ---------- */
  var header = document.querySelector(".site-header");
  var progressBar = document.getElementById("scrollProgress");
  var backToTop = document.getElementById("backToTop");
  var scrollTicking = false;
  var onScroll = function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        if (header) header.classList.toggle("scrolled", window.scrollY > 30);
        if (progressBar) {
          var h = document.documentElement.scrollHeight - window.innerHeight;
          progressBar.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
        }
        if (backToTop) backToTop.classList.toggle("show", window.scrollY > 560);
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Custom smooth scroll (rAF + easing) ---------- */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY, duration) {
    var startY = window.scrollY;
    var diff = targetY - startY;
    var startTime = null;
    if (Math.abs(diff) < 2) return;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollTo(0, 0);
      } else {
        smoothScrollTo(0, 500);
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "100px 0px 10% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("revealed"); });
  }

  /* ---------- Toast helper ---------- */
  function showToast(message) {
    var toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  function flyToCart(btnEl) {
    try {
      var card = btnEl.closest('.work-card');
      var img = card ? card.querySelector('.work-card__media img') : null;
      var cartIcon = document.getElementById('cartToggle');
      if (!img || !cartIcon || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var r = img.getBoundingClientRect();
      var c = cartIcon.getBoundingClientRect();
      var clone = img.cloneNode(true);
      Object.assign(clone.style, {
        position: 'fixed',
        left: r.left + 'px',
        top: r.top + 'px',
        width: r.width + 'px',
        height: r.height + 'px',
        transition: 'all 0.65s cubic-bezier(.5,-.3,.5,1)',
        zIndex: '9999',
        pointerEvents: 'none',
        opacity: '0.9',
        borderRadius: '50%',
        objectFit: 'cover'
      });
      document.body.appendChild(clone);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          Object.assign(clone.style, {
            left: (c.left + c.width / 2 - 20) + 'px',
            top: (c.top + c.height / 2 - 20) + 'px',
            width: '40px',
            height: '40px',
            opacity: '0.3'
          });
        });
      });
      setTimeout(function () { clone.remove(); }, 700);
    } catch (err) { /* silent */ }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getProducts() {
    return GC.products || [];
  }

  function getSettings() {
    return GC.settings || {};
  }

  /* ---------- Wishlist ---------- */
  var WISH_KEY = "gulnish-wishlist-v1";

  function loadWish() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveWish(arr) {
    localStorage.setItem(WISH_KEY, JSON.stringify(arr));
  }

  function isWished(id) {
    return loadWish().indexOf(id) !== -1;
  }

  function toggleWish(id) {
    var arr = loadWish();
    var i = arr.indexOf(id);
    var out;
    if (i === -1) { arr.push(id); out = true; showToast("Saved to wishlist"); }
    else { arr.splice(i, 1); out = false; showToast("Removed from wishlist"); }
    saveWish(arr);
    return out;
  }

  function updateWishCount() {
    var el = document.getElementById("wishlistCount");
    if (!el) return;
    var n = loadWish().length;
    el.textContent = n;
    el.classList.toggle("show", n > 0);
  }

  function shippingInfo(subtotal) {
    var s = getSettings();
    var fee = s.shippingFee != null && s.shippingFee !== "" ? parseFloat(s.shippingFee) : null;
    var freeMin = s.freeDeliveryMin || 0;
    if (freeMin > 0 && subtotal >= freeMin) return { text: "Delivery: Free", amount: 0, isFree: true };
    if (fee != null && !isNaN(fee)) return { text: "Delivery: " + money(fee), amount: fee, isFree: false };
    return { text: "Delivery: charged on WhatsApp (actual courier rate)", amount: null, isFree: false };
  }

  function money(value) {
    var n = parseFloat(value) || 0;
    var str = String(Math.round(n * 100) / 100);
    var parts = str.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return "Rs. " + parts.join(".");
  }

  function stockStatus(p) {
    var st = p && p.stock != null ? parseInt(p.stock, 10) : null;
    if (st !== null && st <= 0) return "sold out";
    var s = String((p && p.status) || "").trim().toLowerCase();
    if (s === "sold out" || s === "sold-out") return "sold out";
    if (s === "made to order" || s === "made-to-order") return "made to order";
    return "in stock";
  }

  function stockLeft(p) {
    var st = p && p.stock != null ? parseInt(p.stock, 10) : null;
    return st !== null && st > 0 ? st : null;
  }

  function stockBadgeHTML(p) {
    var s = stockStatus(p);
    if (s === "sold out") return '<div class="work-card__badge work-card__badge--out">Sold out</div>';
    if (s === "made to order") return '<div class="work-card__badge work-card__badge--made">Made to order &middot; ~5 days</div>';
    var left = stockLeft(p);
    if (left != null && left <= 2) return '<div class="work-card__badge work-card__badge--low">Only ' + left + ' left</div>';
    return "";
  }

  /* ---------- Build shop UI ---------- */
  var productGrid = document.getElementById("productGrid");
  var filterWrap = document.getElementById("filters");
  var noProducts = document.getElementById("noProducts");
  var searchInput = document.getElementById("searchInput");
  var noResults = document.getElementById("noResults");
  var sortSelect = document.getElementById("sortSelect");
  var productCountLabel = document.getElementById("productCountLabel");
  var featuredGrid = document.getElementById("featuredGrid");

  function cardHTML(p, index) {
    var imgSrc = displayImage(p.image);
    var isFirst = typeof index === "number" && index === 0;
    var image = imgSrc
      ? '<img src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '"' +
        (isFirst ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"') + ">"
      : "";
    var colors =
      p.colors && p.colors.length
        ? '<div class="work-card__colors" data-colors="' +
          p.colors
            .map(function (c) { return c.name + "|" + c.hex; })
            .join(",") +
          '"></div>'
        : "";
    var price =
      parseFloat(p.price) > 0
        ? '<div class="work-card__price">' + money(p.price) + "</div>"
        : "";
    var waNum = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
    var waMsg = "Hi Gulnish Crochet, I'd like to order: *" + (p.name || "this item") + "*" +
      (parseFloat(p.price) > 0 ? " (" + money(p.price) + ")" : "") +
      ".\n\nIs it available?";
    var waHref = waNum
      ? "https://wa.me/" + encodeURIComponent(waNum) + "?text=" + encodeURIComponent(waMsg)
      : "";
    var waBtn = waHref
      ? '<a class="work-card__wa" href="' + waHref + '" target="_blank" rel="noopener" aria-label="Order ' + escapeHtml(p.name) + ' on WhatsApp">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.001 0C5.384 0 0 5.384 0 12.001c0 2.117.554 4.19 1.606 6.009L0 24l6.146-1.612c1.79.977 3.806 1.492 5.855 1.492 6.617 0 12.001-5.384 12.001-12.001C24 5.384 18.616 0 12.001 0z"/></svg>' +
        "</a>"
      : "";
    var media = p.image
      ? '<div class="work-card__media js-product-view" data-view="' + p.id + '">' +
        image +
        waBtn +
        '<button class="wish-heart' + (isWished(p.id) ? " wished" : "") +
          '" data-wish="' + p.id +
          '" aria-pressed="' + (isWished(p.id) ? "true" : "false") +
          '" aria-label="Save ' + escapeHtml(p.name) + '">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="' + (isWished(p.id) ? "var(--gold)" : "none") +
            '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
          "</button>" +
        "</div>"
      : '<div class="work-card__media js-product-view" data-view="' + p.id + '"></div>';
    return (
      '<article class="work-card" data-category="' + p.category + '">' +
      media +
      '<div class="work-card__body">' +
      '<h3 class="work-card__name">' + escapeHtml(p.name) + "</h3>" +
      price +
      stockBadgeHTML(p) +
      colors +
      buildCardAddBtn(p) +
      "</div></article>"
    );
  }

  function buildCardAddBtn(p) {
    var common = ' type="button" data-id="' + p.id + '" data-name="' + escapeHtml(p.name) + '" data-price="' + (p.price || 0) + '"';
    if (stockStatus(p) === "sold out") {
      return '<button class="add-btn add-btn--sold" disabled' + common + '>Sold out</button>';
    }
    return '<button class="add-btn"' + common + '>' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="9" cy="21" r="1"></circle>' +
      '<circle cx="20" cy="21" r="1"></circle>' +
      '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' +
      "</svg>" +
      "Add to Cart</button>";
  }

  function buildFilters(settings) {
    if (!filterWrap) return;
    filterWrap.innerHTML = "";
    var makeBtn = function (filter, label, active) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-btn" + (active ? " active" : "");
      btn.dataset.filter = filter;
      btn.textContent = label;
      return btn;
    };
    filterWrap.appendChild(makeBtn("all", "All", true));
    var products = getProducts().filter(function (p) { return p.image; });
    (settings.categories || []).forEach(function (label, i) {
      var key = "gr" + (i + 1);
      if (!products.some(function (p) { return p.category === key; })) return;
      filterWrap.appendChild(makeBtn(key, label || "Category " + (i + 1), false));
    });
  }

  var cards = [];
  var INITIAL_VISIBLE = 8;
  var SHOW_STEP = 8;
  var visibleCount = INITIAL_VISIBLE;
  var showMoreBtn = document.getElementById("showMore");

  function isFiltering() {
    var term = searchInput ? searchInput.value.trim() : "";
    var activeBtn = document.querySelector(".filter-btn.active");
    return term !== "" || (activeBtn && activeBtn.dataset.filter !== "all");
  }

  function updateShowMoreBtn() {
    if (!showMoreBtn) return;
    var remaining = cards.length - visibleCount;
    showMoreBtn.hidden = isFiltering() || remaining <= 0;
    showMoreBtn.textContent = "Show more (" + remaining + ")";
  }

  function applyFilters() {
    var term =
      (searchInput ? searchInput.value.trim().toLowerCase() : "") || "";
    var activeBtn = document.querySelector(".filter-btn.active");
    var target = (activeBtn && activeBtn.dataset.filter) || "all";
    var filtering = isFiltering();

    var visible = 0;
    cards.forEach(function (card, index) {
      var inRange = filtering || index < visibleCount;
      var categoryMatch = target === "all" || card.dataset.category === target;

      var addBtn = card.querySelector(".add-btn");
      var nameEl = card.querySelector(".work-card__name");
      var name = (
        (addBtn && addBtn.dataset.name ? addBtn.dataset.name : "") +
        " " +
        (nameEl ? nameEl.textContent : "")
      ).toLowerCase();

      var prod = addBtn ? getProducts().find(function (x) { return x.id === addBtn.dataset.id; }) : null;
      if (prod) {
        name += " " + ((prod.keywords && prod.keywords.join) ? prod.keywords.join(" ") : "");
        name += " " + ((prod.colors || []).map(function (c) { return c.name; }).join(" "));
        name += " " + (categoryLabelOf(prod.category) || "");
      }

      var termMatch = !term || name.indexOf(term) !== -1;
      var show = inRange && categoryMatch && termMatch;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });

    if (noResults) noResults.hidden = visible > 0;
    updateShowMoreBtn();
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener("click", function () {
      visibleCount += SHOW_STEP;
      applyFilters();
    });
  }

  function refreshCards() {
    cards = Array.from(document.querySelectorAll("[data-category]"));
    if (cards.length) applyFilters();
  }

  function renderProducts(products) {
    var withImages = (products || []).filter(function (p) { return p.image; });
    if (productGrid) productGrid.innerHTML = withImages.map(cardHTML).join("");
    if (noProducts) noProducts.hidden = withImages.length > 0;
    if (productCountLabel) {
      productCountLabel.textContent =
        "Showing " + withImages.length + " handmade piece" +
        (withImages.length === 1 ? "" : "s");
    }

    var empty = !withImages.length;
    document.querySelectorAll(".shop-tools, .products-topbar, .show-more-wrap, .shop-bar").forEach(function (el) {
      el.hidden = empty;
    });
    if (productsView) productsView.hidden = false;

    buildColorSwatches();
    refreshCards();
  }

  function sortProducts(products, value) {
    var arr = (products || []).slice();
    if (value === "low") {
      arr.sort(function (a, b) { return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0); });
    } else if (value === "high") {
      arr.sort(function (a, b) { return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0); });
    } else if (value === "name") {
      arr.sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
    }
    return arr;
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      var withImages = sortProducts(getProducts(), sortSelect.value).filter(function (p) { return p.image; });
      if (productGrid) productGrid.innerHTML = withImages.map(cardHTML).join("");
      buildColorSwatches();
      refreshCards();
    });
  }

  function renderFeatured() {
    if (!featuredGrid) return;
    var items = getProducts().filter(function (p) { return p.image; }).slice(0, 8);
    featuredGrid.innerHTML = items.map(cardHTML).join("");
    var featuredSection = featuredGrid.closest(".section") || featuredGrid.closest("section");
    if (featuredSection) featuredSection.hidden = !items.length;
  }

  /* ---------- Category overview (one main image per category) ---------- */
  var categoryView = document.getElementById("categoryView");
  var productsView = document.getElementById("productsView");

  function categoryCardHTML(label, count, images, catKey) {
    var slides = (images || []).filter(Boolean).map(function (s) { return displayImage(s); });
    var img = slides.length
      ? '<img src="' + slides[0] + '" alt="' + escapeHtml(label) + '" loading="lazy" decoding="async" data-slides="' +
        slides.join("|").replace(/"/g, "&quot;") + '">'
      : "";
    return (
      '<button class="category-card" type="button" data-cat="' + catKey + '">' +
      '<span class="category-card__img"><span class="image-slot">' + img + "</span></span>" +
      '<span class="category-card__body">' +
      '<span class="category-card__name">' + escapeHtml(label) + "</span>" +
      '<span class="category-card__count">' + count + " item" + (count === 1 ? "" : "s") + "</span>" +
      "</span></button>"
    );
  }

  function startCategorySlideshows() {
    document
      .querySelectorAll(".category-card__img [data-slides]")
      .forEach(function (firstLayer) {
        var slides = firstLayer.dataset.slides.split("|").filter(Boolean);
        if (slides.length < 2) return;

        var box = firstLayer.parentElement;
        box.classList.add("slideshow");
        var secondLayer = firstLayer.cloneNode(true);
        secondLayer.removeAttribute("data-slides");
        secondLayer.src = slides[1];
        secondLayer.style.opacity = "0";
        firstLayer.classList.add("slideshow-layer");
        secondLayer.classList.add("slideshow-layer");
        box.appendChild(secondLayer);

        var showingFirst = true;
        var timer = null;
        var tick = function () {
          var show = showingFirst ? secondLayer : firstLayer;
          var hide = showingFirst ? firstLayer : secondLayer;
          showingFirst = !showingFirst;
          show.style.opacity = "1";
          hide.style.opacity = "0";
        };
        var startSlideshow = function () {
          if (timer) return;
          timer = window.setInterval(tick, 2400);
        };
        var stopSlideshow = function () {
          if (timer) {
            window.clearInterval(timer);
            timer = null;
          }
        };
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) startSlideshow();
              else stopSlideshow();
            });
          }, { threshold: 0.1 }).observe(box);
        } else {
          startSlideshow();
        }
      });
  }

  function renderCategoryCards() {
    var grid = document.getElementById("categoryGrid");
    if (!grid) return;
    var settings = getSettings();
    var products = getProducts().filter(function (p) { return p.category && p.image; });
    var cats = settings.categories || [];
    var out = [];
    cats.forEach(function (label, i) {
      var key = "gr" + (i + 1);
      var items = products.filter(function (p) { return p.category === key; });
      if (!items.length) return;
      var catImg =
        settings.categoryImages && settings.categoryImages[key]
          ? settings.categoryImages[key]
          : "";
      var imagesRaw = (Array.isArray(catImg) ? catImg : catImg ? [catImg] : []).filter(Boolean);
      if (!imagesRaw.length) return;
      out.push(
        categoryCardHTML(
          label || "Category " + (i + 1),
          items.length,
          imagesRaw,
          key
        )
      );
    });
    grid.innerHTML = out.join("");

    var shopSection = grid.closest(".section") || grid.closest("section");
    if (shopSection) shopSection.hidden = !out.length;
    startCategorySlideshows();
  }

  function showCategories() {
    if (categoryView) categoryView.hidden = false;
    if (productsView) productsView.hidden = true;
  }

  function showProducts(catKey) {
    if (categoryView) categoryView.hidden = true;
    if (productsView) productsView.hidden = false;
    if (searchInput) searchInput.value = "";
    document.querySelectorAll(".filter-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.filter === catKey);
    });
    visibleCount = INITIAL_VISIBLE;
    applyFilters();
    if (productsView) {
      productsView.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  /* ---------- Product page ---------- */
  var productView = document.getElementById("productView");
  var ppImage = document.getElementById("ppImage");
  var ppName = document.getElementById("ppName");
  var ppPrice = document.getElementById("ppPrice");
  var ppCategory = document.getElementById("ppCategory");
  var ppStatus = document.getElementById("ppStatus");
  var ppColors = document.getElementById("ppColors");
  var ppQtyVal = document.getElementById("ppQtyVal");
  var ppAdd = document.getElementById("ppAdd");
  var ppWa = document.getElementById("ppWa");
  var ppWish = document.getElementById("ppWish");
  var currentProduct = null;
  var currentQty = 1;

  function updatePpWa() {
    if (!ppWa || !currentProduct) return;
    var waNum = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
    var swatch = ppColors ? ppColors.querySelector(".color-swatch.selected") : null;
    var color = swatch ? swatch.dataset.color : "";
    var lines = ["Hi Gulnish Crochet, I'd like to order:"];
    lines.push("*" + (currentProduct.name || "this item") + "*");
    var extra = [];
    if (parseFloat(currentProduct.price) > 0) extra.push("Rs. " + money(currentProduct.price));
    if (color) extra.push("Colour: " + color);
    if (currentQty > 1) extra.push("Qty: " + currentQty);
    if (extra.length) lines.push(extra.join(" \u2022 "));
    lines.push("");
    lines.push("Is it available?");
    ppWa.href = waNum
      ? "https://wa.me/" + encodeURIComponent(waNum) + "?text=" + encodeURIComponent(lines.join("\n"))
      : "#";
  }

  function categoryLabelOf(val, settings) {
    var idx = parseInt(String(val || "").replace("gr", ""), 10) - 1;
    var cats = (settings || getSettings()).categories || [];
    return idx >= 0 && cats[idx] ? cats[idx] : val || "";
  }

  function showProduct(id) {
    var p = getProducts().find(function (x) { return x.id === id; });
    if (!p) return;
    currentProduct = p;
    currentQty = 1;
    if (ppQtyVal) ppQtyVal.textContent = "1";

    if (ppImage) {
      ppImage.innerHTML = p.image
        ? '<img src="' + displayImage(p.image) + '" alt="' + escapeHtml(p.name) + '">'
        : "";
    }
    if (ppName) ppName.textContent = p.name || "";
    if (ppPrice) {
      ppPrice.textContent =
        parseFloat(p.price) > 0 ? money(p.price) : "";
    }
    if (ppCategory) {
      ppCategory.textContent = categoryLabelOf(p.category);
    }
    if (ppStatus) {
      var s = stockStatus(p);
      var left = stockLeft(p);
      if (s === "sold out") {
        ppStatus.hidden = false;
        ppStatus.className = "product-page__status status-out";
        ppStatus.textContent = "Sold out";
      } else if (s === "made to order") {
        ppStatus.hidden = false;
        ppStatus.className = "product-page__status status-made";
        ppStatus.textContent = "Made to order \u2014 takes about 5 days";
      } else if (left != null && left <= 2) {
        ppStatus.hidden = false;
        ppStatus.className = "product-page__status status-low";
        ppStatus.textContent = "Only " + left + " left \u2014 order soon";
      } else {
        ppStatus.hidden = false;
        ppStatus.className = "product-page__status status-in";
        ppStatus.textContent = "In stock \u2014 ready to ship";
      }
    }
    if (ppAdd) {
      var soldOut = stockStatus(p) === "sold out";
      ppAdd.disabled = soldOut;
      ppAdd.textContent = soldOut ? "Sold out" : "Add to Cart";
      ppAdd.classList.toggle("is-disabled", soldOut);
    }
    if (ppWish) {
      var wished = isWished(p.id);
      ppWish.classList.toggle("wished", wished);
      ppWish.setAttribute("aria-pressed", wished ? "true" : "false");
      ppWish.querySelector("svg").setAttribute("fill", wished ? "var(--gold)" : "none");
    }
    if (ppColors) {
      ppColors.setAttribute(
        "data-colors",
        (p.colors || [])
          .map(function (c) { return c.name + "|" + c.hex; })
          .filter(function (s) { return s.split("|")[0]; })
          .join(",")
      );
    }
    buildColorSwatches();
    updatePpWa();

    if (categoryView) categoryView.hidden = true;
    if (productsView) productsView.hidden = true;
    if (productView) productView.hidden = false;
    if (productView) productView.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function showProductList() {
    currentProduct = null;
    if (productView) productView.hidden = true;
    if (productsView) productsView.hidden = false;
    applyFilters();
    if (productsView) productsView.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  if (ppAdd) {
    ppAdd.addEventListener("click", function () {
      if (!currentProduct || stockStatus(currentProduct) === "sold out") return;
      var swatch = ppColors
        ? ppColors.querySelector(".color-swatch.selected")
        : null;
      var bigImg = ppImage ? ppImage.querySelector("img") : null;
      addToCart({
        id: currentProduct.id,
        name: currentProduct.name || "",
        price: parseFloat(currentProduct.price) || 0,
        color: swatch ? swatch.dataset.color : "",
        image: bigImg && bigImg.src ? bigImg.currentSrc || bigImg.src : "",
        qty: currentQty
      });
      flyToCart(ppAdd);
    });
  }

  if (ppWish) {
    ppWish.addEventListener("click", function () {
      if (!currentProduct) return;
      var added = toggleWish(currentProduct.id);
      ppWish.classList.toggle("wished", added);
      ppWish.setAttribute("aria-pressed", added ? "true" : "false");
      ppWish.querySelector("svg").setAttribute("fill", added ? "var(--gold)" : "none");
      updateWishCount();
    });
  }

  document.querySelectorAll("[data-pq]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!currentProduct) return;
      var n =
        btn.dataset.pq === "plus" ? currentQty + 1 : currentQty - 1;
      currentQty = Math.min(99, Math.max(1, n));
      if (ppQtyVal) ppQtyVal.textContent = String(currentQty);
      updatePpWa();
    });
  });

  document.addEventListener("click", function (e) {
    var catBtn = e.target.closest(".category-card");
    if (catBtn) {
      if (productsView) {
        showProducts(catBtn.dataset.cat);
      } else {
        location.href =
          "products.html?cat=" + encodeURIComponent(catBtn.dataset.cat);
      }
      return;
    }
    var backBtn = e.target.closest("[data-back-categories]");
    if (backBtn) {
      if (backBtn.dataset.backCategories === "all") {
        if (productsView) showProducts("all");
        else location.href = "products.html";
      } else if (categoryView) {
        showCategories();
      } else {
        location.href = "index.html";
      }
      return;
    }
    var viewBtn = e.target.closest(".js-product-view");
    if (viewBtn && !e.target.closest(".work-card__wa")) {
      if (productView) {
        showProduct(viewBtn.dataset.view);
      } else {
        location.href = "products.html";
      }
      return;
    }
    var backP = e.target.closest("[data-back-products]");
    if (backP) showProductList();
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document
      .querySelectorAll(".filter-btn")
      .forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    applyFilters();
  });

  /* ---------- Build color swatches from data-colors ---------- */
  function buildColorSwatches() {
    document
      .querySelectorAll(".work-card__colors[data-colors]")
      .forEach(function (box) {
        var raw = box.dataset.colors;
        if (!raw) return;
        box.innerHTML = "";
        raw.split(",").forEach(function (pair, idx) {
          var parts = pair.split("|");
          var name = parts[0];
          var hex = parts[1];
          var swatch = document.createElement("button");
          swatch.type = "button";
          swatch.className = "color-swatch";
          swatch.dataset.color = (name || "").trim();
          swatch.style.setProperty("--swatch", (hex || "#ccc").trim());
          swatch.setAttribute("aria-label", (name || "Color").trim());
          swatch.setAttribute("aria-pressed", idx === 0 ? "true" : "false");
          if (idx === 0) swatch.classList.add("selected");
          box.appendChild(swatch);
        });
      });
  }

  /* ---------- Cart ---------- */
  var STORAGE_KEY = "gulnish-cart";

  var cart = loadCart();

  var cartToggle = document.getElementById("cartToggle");
  var cartClose = document.getElementById("cartClose");
  var cartOverlay = document.getElementById("cartOverlay");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartItemsEl = document.getElementById("cartItems");
  var cartCountEl = document.getElementById("cartCount");
  var cartSubtotalEl = document.getElementById("cartSubtotal");
  var cartBar = document.getElementById("cartBar");
  var cartBarCount = document.getElementById("cartBarCount");
  var cartBarTotal = document.getElementById("cartBarTotal");
var cartBarBtn = document.getElementById("cartBarBtn");
var cartWa = document.getElementById("cartWa");
var bottomNavCount = document.getElementById("bottomNavCount");
var bottomNavCart = document.getElementById("bottomNavCart");

  function waBase() {
    var num = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
    return num ? "https://wa.me/" + encodeURIComponent(num) : "";
  }

  function updateCartWa() {
    if (!cartWa) return;
    var base = waBase();
    if (!base || !cart.length) {
      cartWa.href = base || "#";
      return;
    }
    var lines = ["Hi Gulnish Crochet, I'd like to place this order:", ""];
    cart.forEach(function (item) {
      var imageUrl = item.image
        ? (/^https?:\/\//i.test(item.image)
            ? item.image
            : window.location.origin + "/" + String(item.image).replace(/^\/+/, ""))
        : "";
      lines.push(
        "\u2022 " + (item.name || "Item") +
        (imageUrl ? " \u2014 Photo: " + imageUrl : "") +
        (item.qty > 1 ? " x" + item.qty : "") +
        (item.color ? " (" + item.color + ")" : "") +
        " \u2014 " + money(cartUnitPrice(item) * item.qty)
      );
    });
    lines.push("");
    lines.push(shippingInfo(cartTotalPrice()).text);
    lines.push("Total: *" + money(cartTotalPrice()) + "*");
    var profile =
      GC && GC.getCustomerProfile ? GC.getCustomerProfile() : null;
    if (profile && (profile.name || profile.phone || profile.city)) {
      lines.push("");
      lines.push("Name: " + (profile.name || "-"));
      if (profile.phone) lines.push("Phone: +" + String(profile.phone).replace(/^0+/, ""));
      if (profile.city) lines.push("City: " + profile.city);
      if (profile.address) lines.push("Address: " + profile.address);
    } else {
      lines.push("");
      lines.push("My delivery name, phone and city:");
    }
    lines.push("");
    lines.push("Please confirm availability and delivery.");
    cartWa.href = base + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function loadCart() {
    try {
      var items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return items.map(function (item) {
        return Object.assign({}, item, { key: item.key || itemKey(item) });
      });
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function cartTotalQty() {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function cartUnitPrice(item) {
    var found = (getProducts() || []).find(function (x) { return x.id === item.id; });
    return found && parseFloat(found.price) > 0
      ? parseFloat(found.price)
      : (parseFloat(item.price) || 0);
  }

  function cartTotalPrice() {
    return cart.reduce(
      function (sum, item) { return sum + cartUnitPrice(item) * item.qty; }, 0
    );
  }

  function itemKey(item) {
    return item.id + (item.color ? "__" + item.color : "");
  }

  function addToCart(product) {
    var qty = Math.max(1, parseInt(product.qty, 10) || 1);
    var key = itemKey(product);
    var existing = cart.find(function (item) { return itemKey(item) === key; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push(Object.assign({}, product, { key: key, qty: qty }));
    }
    saveCart();
    renderCart();
    bumpBadge();
    showToast("Added to cart");
  }

  function removeFromCart(key) {
    cart = cart.filter(function (item) { return item.key !== key; });
    saveCart();
    renderCart();
  }

  function setQty(key, qty) {
    var item = cart.find(function (i) { return i.key === key; });
    if (!item) return;
    item.qty = Math.max(0, qty);
    if (item.qty === 0) cart = cart.filter(function (i) { return i.key !== key; });
    saveCart();
    renderCart();
  }

  function renderCart() {
    var n = cartTotalQty();
    var total = cartTotalPrice();
    document.body.classList.toggle("has-cart", n > 0);
    if (bottomNavCount) {
      bottomNavCount.textContent = n;
      bottomNavCount.classList.toggle("show", n > 0);
    }
    updateCartWa();
    if (cartCountEl) {
      cartCountEl.textContent = n;
      cartCountEl.classList.toggle("show", n > 0);
    }
    if (cartBar) cartBar.classList.toggle("show", n > 0);
    if (cartBarCount) cartBarCount.textContent = n;
    if (cartBarTotal) cartBarTotal.textContent = money(total);
    if (!cartItemsEl) return;

    if (!cart.length) {
      cartItemsEl.innerHTML =
        '<div class="cart-empty"><span class="cart-empty__ph">&#128722;</span>' +
        "<p>Your cart is empty</p></div>";
      if (cartSubtotalEl) cartSubtotalEl.textContent = money(0);
      var emptyProg = cartDrawer ? cartDrawer.querySelector('.cart-delivery-progress') : null;
      if (emptyProg) emptyProg.hidden = true;
      return;
    }

    cartItemsEl.innerHTML = cart
      .map(function (item) {
        return (
          '<div class="cart-item">' +
          '<div class="cart-item__img">' +
          (item.image
            ? '<img src="' + item.image + '" alt="' + (item.name || "").replace(/"/g, "&quot;") + '">'
            : '<span class="cart-item__ph">&#128722;</span>') +
          "</div>" +
          '<div class="cart-item__info">' +
          '<span class="cart-item__name">' + (item.name || "Item") + "</span>" +
          '<span class="cart-item__price">' + money(cartUnitPrice(item)) + "</span>" +
          (item.color ? '<span class="cart-item__color">' + item.color + "</span>" : "") +
          '<div class="qty">' +
          '<button class="qty__btn" data-action="minus" data-key="' + item.key + '" aria-label="Decrease">&#8722;</button>' +
          '<span class="qty__val">' + item.qty + "</span>" +
          '<button class="qty__btn" data-action="plus" data-key="' + item.key + '" aria-label="Increase">+</button>' +
          "</div></div>" +
          '<button class="cart-item__remove" data-action="remove" data-key="' + item.key + '" aria-label="Remove">&times;</button>' +
          "</div>"
        );
      })
      .join("");

    if (cartSubtotalEl) cartSubtotalEl.textContent = money(cartTotalPrice());

    /* Shipping line */
    var shipEl = cartDrawer ? cartDrawer.querySelector('.cart-shipping') : null;
    if (!shipEl && cartDrawer) {
      shipEl = document.createElement('div');
      shipEl.className = 'cart-shipping';
      var cartFoot = cartDrawer.querySelector('.cart-drawer__foot');
      if (cartFoot) cartFoot.parentNode.insertBefore(shipEl, cartFoot);
    }
    if (shipEl) {
      var sub = cartTotalPrice();
      shipEl.textContent = shippingInfo(sub).text;
      shipEl.classList.toggle('cart-shipping--free', shippingInfo(sub).isFree);
    }

    /* Free-delivery progress */
    var freeMin = (getSettings() && getSettings().freeDeliveryMin) || 0;
    var progWrap = cartDrawer ? cartDrawer.querySelector('.cart-delivery-progress') : null;
    if (freeMin > 0) {
      if (progWrap) progWrap.hidden = false;
      if (!progWrap && cartDrawer) {
        progWrap = document.createElement('div');
        progWrap.className = 'cart-delivery-progress';
        progWrap.innerHTML = '<div class="cart-delivery-bar"><div class="cart-delivery-fill"></div></div><p class="cart-delivery-msg"></p>';
        var cartFoot2 = cartDrawer.querySelector('.cart-drawer__foot');
        if (cartFoot2) cartFoot2.parentNode.insertBefore(progWrap, cartFoot2);
      }
      if (progWrap) {
        var sub2 = cartTotalPrice();
        var pct = Math.min(100, (sub2 / freeMin) * 100);
        var progFill = progWrap.querySelector('.cart-delivery-fill');
        var progMsg = progWrap.querySelector('.cart-delivery-msg');
        if (progFill) progFill.style.width = pct + '%';
        if (progMsg) {
          if (pct >= 100) progMsg.innerHTML = '&#10003; Free delivery unlocked!';
          else progMsg.textContent = 'Add ' + money(freeMin - sub2) + ' more for free delivery';
        }
        progWrap.classList.toggle('done', pct >= 100);
      }
    } else if (progWrap) {
      progWrap.hidden = true;
    }
  }

  function openCart() {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function bumpBadge() {
    if (!cartCountEl) return;
    cartCountEl.classList.remove("bump");
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add("bump");
  }

  document.addEventListener("click", function (e) {
    var swatch = e.target.closest(".color-swatch");
    if (swatch) {
      var scope =
        swatch.closest(".work-card") || swatch.closest(".product-page");
      if (scope) {
        scope.querySelectorAll(".color-swatch").forEach(function (s) {
          s.classList.remove("selected");
          s.setAttribute("aria-pressed", "false");
        });
        swatch.classList.add("selected");
        swatch.setAttribute("aria-pressed", "true");
      }
      updatePpWa();
      return;
    }

    var wishBtn = e.target.closest("[data-wish]");
    if (wishBtn) {
      var id = wishBtn.dataset.wish;
      if (id) {
        var added = toggleWish(id);
        wishBtn.classList.toggle("wished", added);
        wishBtn.setAttribute("aria-pressed", added ? "true" : "false");
        wishBtn.querySelector("svg").setAttribute("fill", added ? "var(--gold)" : "none");
        updateWishCount();
        renderWishlistGrid();
      }
      return;
    }

    var addBtn = e.target.closest(".add-btn");
    if (addBtn) {
      var card = addBtn.closest(".work-card");
      var img = card ? card.querySelector(".work-card__media img") : null;
      var swatchEl = card ? card.querySelector(".color-swatch.selected") : null;
      addToCart({
        id: addBtn.dataset.id || Math.random().toString(36).slice(2),
        name: addBtn.dataset.name || "",
        price: parseFloat(addBtn.dataset.price) || 0,
        color: swatchEl ? swatchEl.dataset.color : "",
        image: img && img.src ? img.currentSrc || img.src : ""
      });
      flyToCart(addBtn);
      return;
    }

    var removeBtn = e.target.closest('[data-action="remove"]');
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.key);
      return;
    }

    var qtyBtn = e.target.closest(".qty__btn");
    if (qtyBtn) {
      var item = cart.find(function (i) { return i.key === qtyBtn.dataset.key; });
      if (item) {
        setQty(
          item.key,
          qtyBtn.dataset.action === "plus" ? item.qty + 1 : item.qty - 1
        );
      }
      return;
    }

    if (e.target.closest("#cartCheckout")) {
      if (!cart.length) {
        showToast("Your cart is empty.");
        return;
      }
      var href = cartWa ? cartWa.href : "";
      if (href && href.indexOf("wa.me") !== -1) {
        window.open(href, "_blank", "noopener");
      } else {
        showToast("WhatsApp number not set yet.");
      }
      return;
    }
  });

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);
  if (cartBarBtn) cartBarBtn.addEventListener("click", openCart);
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      cartDrawer &&
      cartDrawer.classList.contains("open")
    ) {
      closeCart();
    }
  });

  renderCart();
  updateWishCount();

  /* ---------- Lightbox ---------- */
  var lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    var images = [];
    var current = 0;

    var imgEl = lightbox.querySelector(".lightbox__img");
    var capEl = lightbox.querySelector(".lightbox__caption");
    var closeBtn = lightbox.querySelector(".lightbox__close");
    var prevBtn = lightbox.querySelector(".lightbox__nav--prev");
    var nextBtn = lightbox.querySelector(".lightbox__nav--next");

    var open = function (index) {
      current = index;
      var item = images[current];
      imgEl.src = item.src;
      imgEl.alt = item.alt || "";
      capEl.textContent = item.name || "";
      lightbox.classList.add("open");
      document.body.style.overflow = "hidden";
    };

    var close = function () {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    };

    document
      .querySelectorAll(".js-lightbox")
      .forEach(function (slot) {
        slot.addEventListener("click", function () {
          var currentImages = Array.from(
            document.querySelectorAll(".js-lightbox img")
          ).map(function (img) {
            var cardName = img.closest(".work-card") ?
              img.closest(".work-card").querySelector(".work-card__name") : null;
            var prodName = img.closest(".product-page") ?
              img.closest(".product-page").querySelector(".product-page__name") : null;
            return {
              src: img.currentSrc || img.src,
              alt: img.alt,
              name: (cardName ? cardName.textContent : "") ||
                (prodName ? prodName.textContent : "") || ""
            };
          });
          images = currentImages;

          var img = slot.querySelector("img");
          if (!img || !img.src) return;
          open(images.findIndex(function (i) { return i.src === (img.currentSrc || img.src); }));
        });
      });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      open((current - 1 + images.length) % images.length);
    });
    nextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      open((current + 1) % images.length);
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prevBtn.click();
      if (e.key === "ArrowRight") nextBtn.click();
    });
  }

  /* ---------- Skeleton placeholders ---------- */
  var skeletonGrids = ["productGrid", "featuredGrid", "categoryGrid"];
  skeletonGrids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el && !el.innerHTML) {
      var block =
        '<div class="skeleton-card"><div class="skeleton skeleton--img"></div>' +
        '<div class="skeleton skeleton--line"></div>' +
        '<div class="skeleton skeleton--line skeleton--short"></div></div>';
      el.innerHTML = new Array(9).join(block);
    }
  });

  /* ---------- Contact buttons: WhatsApp + Call (from settings) ---------- */
  function updateContactButtons() {
    var waNum = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
    var telHref = waNum ? "tel:+" + waNum : "tel:+923075729901";
    var waHref = waNum
      ? "https://wa.me/" + waNum + "?text=" + encodeURIComponent("Hi Gulnish Crochet, I'd like to place an order.")
      : "";
    document.querySelectorAll(".fb-wa").forEach(function (a) {
      if (waHref) a.href = waHref;
    });
    document.querySelectorAll(".fb-call, .cart-call").forEach(function (a) {
      a.href = telHref;
    });
  }

  /* ---------- Mobile bottom navigation ---------- */
  if (bottomNavCart) {
    bottomNavCart.addEventListener("click", function () {
      if (cartDrawer && cartToggle) {
        if (!cartDrawer.classList.contains("open")) openCart();
      }
    });
  }
  (function highlightBottomNav() {
    if (!document.querySelector(".bottom-nav")) return;
    var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var key = {
      "index.html": "home",
      "products.html": "products",
      "orders.html": "orders",
      "about.html": "about",
      "contact.html": "contact"
    }[page] || "";
    document.querySelectorAll(".bottom-nav__item[data-nav]").forEach(function (el) {
      if (el.dataset.nav === key) el.classList.add("active");
    });
  })();

  /* ---------- Wishlist page ---------- */
  function renderWishlistGrid() {
    var grid = document.getElementById("wishlistGrid");
    if (!grid) return;
    var wished = loadWish();
    var list = getProducts().filter(function (p) { return wished.indexOf(p.id) !== -1; });
    if (!list.length) {
      grid.innerHTML =
        '<div class="cart-empty wishlist-empty"><span class="cart-empty__ph">&hearts;</span>' +
        '<p>Your wishlist is empty.</p>' +
        '<p class="muted">Tap the heart on any product to save it here.</p>' +
        '<a class="btn" href="products.html">Browse products</a></div>';
      return;
    }
    grid.innerHTML = list.map(function (p, i) { return cardHTML(p, i); }).join("");
  }

  /* ---------- Render shop once shared data is loaded ---------- */
  function renderShop() {
    var settings = getSettings();
    updateContactButtons();
    buildFilters(settings);
    renderCategoryCards();
    renderFeatured();
    renderProducts(getProducts());
    renderWishlistGrid();
    var urlCat = new URLSearchParams(location.search).get("cat");
    var urlQ = (new URLSearchParams(location.search).get("q") || "").trim();
    if (searchInput && urlQ) searchInput.value = urlQ;
    if (productsView) {
      showProducts(urlCat ? urlCat : "all");
    } else {
      showCategories();
    }
    if (searchInput) searchInput.addEventListener("input", applyFilters);
  }

  if (GC && GC.init) {
    GC.init().then(renderShop);
  } else {
    renderShop();
  }
})();
