/* =========================================================
   Gulnish Crochet — checkout page logic (professional build)
   Steps: 1. Shipping → 2. Payment → 3. Review → Confirm
   ========================================================= */

(function () {
  "use strict";

  var GC = window.GC;
  var CART_KEY = "gulnish-cart";

  var PAYMENT_METHODS = [
    "Cash on delivery",
    "Bank transfer",
    "JazzCash / EasyPaisa",
    "WhatsApp to arrange"
  ];

  function money(value) {
    var n = parseFloat(value) || 0;
    var str = String(Math.round(n * 100) / 100);
    var parts = str.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return "Rs. " + parts.join(".");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function friendlyDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return "";
    }
  }

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function livePrice(item) {
    var list = (GC && GC.products) || [];
    var found = list.find(function (x) { return x.id === item.id; });
    return found && parseFloat(found.price) > 0
      ? parseFloat(found.price)
      : (parseFloat(item.price) || 0);
  }

  function absImage(src) {
    if (!src) return "";
    return /^https?:\/\//i.test(src)
      ? src
      : (window.location.origin + "/" + String(src).replace(/^\/+/, ""));
  }

  function cartTotalPrice(items) {
    return items.reduce(
      function (sum, item) { return sum + livePrice(item) * item.qty; },
      0
    );
  }

  function currentPayment() {
    var checked = document.querySelector('input[name="coPayment"]:checked');
    return checked ? checked.value : PAYMENT_METHODS[0];
  }

  function shippingNote(items) {
    var s = (GC && GC.settings) || {};
    var sub = cartTotalPrice(items);
    var fee = s.shippingFee != null && s.shippingFee !== "" ? parseFloat(s.shippingFee) : null;
    var freeMin = s.freeDeliveryMin || 0;
    if (freeMin > 0 && sub >= freeMin) return { text: "", amount: 0, isFree: true };
    if (fee != null && !isNaN(fee)) return { text: "Delivery: " + money(fee), amount: fee, isFree: false };
    return { text: "Delivery: charged on WhatsApp (actual courier rate)", amount: null, isFree: false };
  }

  /* Best-effort email receipt (never blocks placing the order). */
  function sendOrderEmail(order) {
    var to = order.customer && order.customer.email;
    if (!to) return;
    try {
      fetch("/api/send-order-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to, order: order })
      }).catch(function () {});
    } catch (err) { /* keep the order flowing */ }
  }

  /* ---------- elements ---------- */
  var itemsEl = document.getElementById("coItems");
  var itemsEl2 = document.getElementById("coItems2");
  var subtotalEl = document.getElementById("coSubtotal");
  var subtotalEl2 = document.getElementById("coSubtotal2");
  var emptyWrap = document.getElementById("coEmpty");
  var formWrap = document.getElementById("coForm");
  var form = document.getElementById("coFormEl");
  var placeBtn = document.getElementById("coPlace");
  var success = document.getElementById("coSuccess");
  var successNo = document.getElementById("coSuccessNo");
  var successEta = document.getElementById("coSuccessEta");
  var successEtaDate = document.getElementById("coSuccessEtaDate");
  var successCopy = document.getElementById("coSuccessCopy");
  var waLinkEl = document.getElementById("coWaLink");
  var waMissingEl = document.getElementById("coWaMissing");
  var btnText = document.getElementById("coBtnText");
  var btnLoading = document.getElementById("coBtnLoading");
  var coBar = document.getElementById("coBar");
  var coBarBtn = document.getElementById("coBarBtn");
  var coBarBtnText = document.getElementById("coBarBtnText");
  var coBarBtnLoading = document.getElementById("coBarBtnLoading");
  var coBarTotal = document.getElementById("coBarTotal");
  var coBarBack = document.getElementById("coBarBack");
  var payGroup = document.getElementById("coPaymentGroup");
  var payInfo = document.getElementById("coPaymentInfo");

  /* ---------- step elements ---------- */
  var step1 = document.getElementById("step1");
  var step2 = document.getElementById("step2");
  var step3 = document.getElementById("step3");
  var progressFill = document.getElementById("checkoutProgressFill");
  var stepDots = document.querySelectorAll(".checkout-step-dot");

  var currentStep = 1;

  function updateStrip() {
    var stripDelivery = document.getElementById("coStripDelivery");
    var stripDelivery2 = document.getElementById("coStripDelivery2");
    var stripEta = document.getElementById("coStripEta");
    var stripEta2 = document.getElementById("coStripEta2");

    var name = (document.getElementById("coName") || {}).value || "";
    var address = (document.getElementById("coAddress") || {}).value || "";
    var city = (document.getElementById("coCity") || {}).value || "";
    var text = name
      ? name + (address ? " · " + address : "") + (city ? ", " + city : "")
      : "Add your details above";

    if (stripDelivery) stripDelivery.textContent = text;
    if (stripDelivery2) stripDelivery2.textContent = text;

    var eta = GC && GC.deliveryEstimate ? GC.deliveryEstimate(new Date().toISOString(), false) : "";
    var etaText = eta ? friendlyDate(eta) : "";
    if (stripEta) stripEta.textContent = etaText;
    if (stripEta2) stripEta2.textContent = etaText;
  }

  function renderReviewPayment() {
    var el = document.getElementById("coReviewPayment");
    if (!el) return;
    var method = currentPayment();
    el.innerHTML = '<p class="co-review-row"><span>Method</span><strong>' + escapeHtml(method) + "</strong></p>";
  }

  function renderReviewAddress() {
    var el = document.getElementById("coReviewAddress");
    if (!el) return;
    var get = function (id) { return (document.getElementById(id) || {}).value || ""; };

    var name = get("coName");
    var phone = get("coPhone");
    var email = get("coEmail");
    var address = get("coAddress");
    var landmark = get("coLandmark");
    var city = get("coCity");
    var province = get("coProvince");

    var rows = "";
    if (name) rows += coReviewRow("Name", name);
    if (phone) rows += coReviewRow("Phone", "+" + String(phone).replace(/[^\d]/g, "").replace(/^0+/, ""));
    if (email) rows += coReviewRow("Email", email);
    if (address) rows += coReviewRow("Address", address + (landmark ? " <span class=\"co-review-muted\">(near " + escapeHtml(landmark) + ")</span>" : ""));
    if (city) rows += coReviewRow("City", city + (province ? ", " + province : ""));
    if (!rows) rows = '<p class="co-review-empty">No shipping details yet.</p>';
    el.innerHTML = rows;
  }

  function coReviewRow(label, value) {
    return '<p class="co-review-row"><span>' + escapeHtml(label) + "</span><strong>" + value + "</strong></p>";
  }

  function readNotes() {
    return (document.getElementById("coNotes") || {}).value || "";
  }

  function renderReview() {
    var items = loadCart();
    var itemsReview = document.getElementById("coReviewItems");
    var subReview = document.getElementById("coReviewSubtotal");
    var shipReview = document.getElementById("coReviewShipping");
    var totalReview = document.getElementById("coReviewTotal");

    if (itemsReview) {
      itemsReview.innerHTML = items
        .map(function (item) {
          return (
            '<div class="co-item">' +
            '<div class="co-item__img">' +
            (item.image
              ? '<img src="' + item.image + '" alt="" loading="lazy" decoding="async">'
              : "<span class='cart-item__ph'>&#128722;</span>") +
            "</div>" +
            '<div class="co-item__info">' +
            '<span class="co-item__name">' + (escapeHtml(item.name) || "Item") + "</span>" +
            (item.color ? '<span class="co-item__color">' + escapeHtml(item.color) + "</span>" : "") +
            '<span class="co-item__qty">Qty: ' + item.qty + "</span>" +
            "</div>" +
            '<div class="co-item__price">' + money(livePrice(item) * item.qty) + "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    var sub = cartTotalPrice(items);
    if (subReview) subReview.textContent = money(sub);
    var shipText = shippingNote(items).text;
    if (shipReview) {
      shipReview.textContent = shipText;
      shipReview.hidden = !shipText;
    }
    if (totalReview) totalReview.textContent = shipText
      ? money(sub + (parseFloat(shippingNote(items).amount) || 0))
      : money(sub);

    renderReviewAddress();
    renderReviewPayment();

    var notesCard = document.getElementById("coReviewNotesCard");
    var notesEl = document.getElementById("coReviewNotes");
    var notes = readNotes();
    if (notesCard && notesEl) {
      notesEl.textContent = notes;
      notesCard.hidden = !notes;
    }

    var notify = !!(document.getElementById("coNotify") || {}).checked;
    var notifyEl = document.getElementById("coReviewNotify");
    if (notifyEl) {
      notifyEl.hidden = !notify;
    }
  }

  function renderReview() {
    var items = loadCart();
    var itemsReview = document.getElementById("coReviewItems");
    var subReview = document.getElementById("coReviewSubtotal");
    var shipReview = document.getElementById("coReviewShipping");
    var totalReview = document.getElementById("coReviewTotal");

    if (itemsReview) {
      itemsReview.innerHTML = items
        .map(function (item) {
          return (
            '<div class="co-item">' +
            '<div class="co-item__img">' +
            (item.image
              ? '<img src="' + item.image + '" alt="" loading="lazy" decoding="async">'
              : "<span class='cart-item__ph'>&#128722;</span>") +
            "</div>" +
            '<div class="co-item__info">' +
            '<span class="co-item__name">' + (escapeHtml(item.name) || "Item") + "</span>" +
            (item.color ? '<span class="co-item__color">' + escapeHtml(item.color) + "</span>" : "") +
            '<span class="co-item__qty">Qty: ' + item.qty + "</span>" +
            "</div>" +
            '<div class="co-item__price">' + money(livePrice(item) * item.qty) + "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    var sub = cartTotalPrice(items);
    if (subReview) subReview.textContent = money(sub);
    var ship = shippingNote(items);
    if (shipReview) {
      shipReview.textContent = ship.text;
      shipReview.hidden = !ship.text;
    }
    if (totalReview) totalReview.textContent = money(sub + (parseFloat(ship.amount) || 0));

    renderReviewAddress();
    renderReviewPayment();

    var notesCard = document.getElementById("coReviewNotesCard");
    var notesEl = document.getElementById("coReviewNotes");
    var notes = readNotes();
    if (notesCard && notesEl) {
      notesEl.textContent = notes;
      notesCard.hidden = !notes;
    }
  }

  /* ---------- step navigation ---------- */
  function setStep(step) {
    currentStep = step;

    if (step1) step1.hidden = step !== 1;
    if (step2) step2.hidden = step !== 2;
    if (step3) step3.hidden = step !== 3;

    var pct = step === 1 ? 33 : step === 2 ? 66 : 100;
    if (progressFill) progressFill.style.width = pct + "%";

    stepDots.forEach(function (dot, i) {
      var s = i + 1;
      dot.classList.toggle("active", s === step);
      dot.classList.toggle("completed", s < step);
    });

    if (step === 3) renderReview();
    updateBar();
  }

  function gotoStep(step) {
    if (document.documentElement.scrollTop > 300) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setTimeout(function () { setStep(step); }, step > currentStep ? 120 : 0);
  }

  /* ---------- mobile sticky action bar ---------- */
  function setBarVisible(on) {
    if (!coBar) return;
    if (on) {
      coBar.hidden = false;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { coBar.classList.add("show"); });
      });
    } else {
      coBar.classList.remove("show");
      setTimeout(function () { coBar.hidden = true; }, 260);
    }
  }

  function updateBar() {
    if (!coBar) return;
    var items = loadCart();
    if (!items.length || currentStep === 3) {
      if (currentStep === 3 && coBarBack) coBarBack.hidden = false;
      setBarVisible(items.length > 0);
      return;
    }
    if (coBarTotal) coBarTotal.textContent = money(cartTotalPrice(items));
    if (coBarBack) coBarBack.hidden = currentStep === 1;

    var label = currentStep === 1 ? "Continue to Payment" : currentStep === 2 ? "Review Order" : "Place Order";
    if (coBarBtnText) coBarBtnText.textContent = label;
    if (coBarBtnLoading) coBarBtnLoading.hidden = true;
    setBarVisible(true);
  }

  if (coBarBack) {
    coBarBack.addEventListener("click", function () {
      if (currentStep === 3) setStep(2);
      else if (currentStep === 2) setStep(1);
    });
  }

  if (coBarBtn) {
    coBarBtn.addEventListener("click", function () {
      if (currentStep === 1) {
        if (!validateShipping()) return;
        setStep(2);
      } else if (currentStep === 2) {
        setStep(3);
      } else {
        if (!validate()) return;
        placeOrder();
      }
    });
  }

  /* ---------- payment method details ---------- */
  function renderPaymentInfo() {
    if (!payInfo) return;
    var method = currentPayment();
    var s = (GC && GC.settings) || {};
    var html = "";

    if (method === "Bank transfer") {
      if (s.bankAccountTitle || s.bankAccountNo || s.bankIBAN) {
        html = '<div class="co-payment-info__inner">' +
          '<p class="co-payment-info__title">Bank transfer details</p>' +
          (s.bankAccountTitle ? '<p><span>Account title</span><strong>' + escapeHtml(s.bankAccountTitle) + '</strong></p>' : "") +
          (s.bankAccountNo ? '<p><span>Account number</span><strong>' + escapeHtml(s.bankAccountNo) + '</strong></p>' : "") +
          (s.bankIBAN ? '<p><span>IBAN</span><strong>' + escapeHtml(s.bankIBAN) + '</strong></p>' : "") +
          '</div>';
      } else {
        html = '<p class="co-payment-info__inner">Your order will confirm our bank details on WhatsApp so you can complete the transfer.</p>';
      }
    } else if (method === "JazzCash / EasyPaisa") {
      if (s.jazzcashNumber || s.easypaisaNumber) {
        html = '<div class="co-payment-info__inner">' +
          '<p class="co-payment-info__title">Mobile wallet details</p>' +
          (s.jazzcashNumber ? '<p><span>JazzCash</span><strong>' + escapeHtml(s.jazzcashNumber) + '</strong></p>' : "") +
          (s.easypaisaNumber ? '<p><span>EasyPaisa</span><strong>' + escapeHtml(s.easypaisaNumber) + '</strong></p>' : "") +
          '</div>';
      } else {
        html = '<p class="co-payment-info__inner">We will confirm our wallet numbers on WhatsApp after you place the order.</p>';
      }
    }

    payInfo.innerHTML = html;
    payInfo.hidden = !html;
  }

  if (payGroup) {
    payGroup.addEventListener("change", function () {
      renderPaymentInfo();
      if (currentStep === 3) renderReviewPayment();
    });
  }

  /* ---------- order summary ---------- */
  function renderSummary(items) {
    if (!itemsEl && !itemsEl2) return;
    if (!items.length) {
      if (itemsEl) itemsEl.innerHTML = "";
      if (itemsEl2) itemsEl2.innerHTML = "";
      if (subtotalEl) subtotalEl.textContent = money(0);
      if (subtotalEl2) subtotalEl2.textContent = money(0);
      var emptyShip = document.getElementById("coShipping");
      if (emptyShip) emptyShip.hidden = true;
      var emptyShip2 = document.getElementById("coShipping2");
      if (emptyShip2) emptyShip2.hidden = true;
      if (emptyWrap) emptyWrap.hidden = false;
      if (formWrap) formWrap.hidden = true;
      if (step1) step1.hidden = true;
      updateBar();
      return;
    }
    if (emptyWrap) emptyWrap.hidden = true;
    if (formWrap) formWrap.hidden = false;

    var html = items
      .map(function (item) {
        return (
          '<div class="co-item">' +
          '<div class="co-item__img">' +
          (item.image
            ? '<img src="' + item.image + '" alt="" loading="lazy" decoding="async">'
            : "<span class='cart-item__ph'>&#128722;</span>") +
          "</div>" +
          '<div class="co-item__info">' +
          '<span class="co-item__name">' + (escapeHtml(item.name) || "Item") + "</span>" +
          (item.color ? '<span class="co-item__color">' + escapeHtml(item.color) + "</span>" : "") +
          '<span class="co-item__qty">Qty: ' + item.qty + "</span>" +
          "</div>" +
          '<div class="co-item__price">' + money(livePrice(item) * item.qty) + "</div>" +
          "</div>"
        );
      })
      .join("");

    if (itemsEl) itemsEl.innerHTML = html;
    if (itemsEl2) itemsEl2.innerHTML = html;
    if (subtotalEl) subtotalEl.textContent = money(cartTotalPrice(items));
    if (subtotalEl2) subtotalEl2.textContent = money(cartTotalPrice(items));

    var shipEl = document.getElementById("coShipping");
    if (shipEl) {
      var ship = shippingNote(items);
      shipEl.textContent = ship.text;
      shipEl.hidden = !ship.text;
    }
    var shipEl2 = document.getElementById("coShipping2");
    if (shipEl2) {
      var ship2 = shippingNote(items);
      shipEl2.textContent = ship2.text;
      shipEl2.hidden = !ship2.text;
    }
    updateBar();
  }

  function setLoading(loading) {
    if (!placeBtn) return;
    placeBtn.disabled = loading;
    if (btnText) btnText.hidden = loading;
    if (btnLoading) btnLoading.hidden = !loading;
    if (coBarBtn) coBarBtn.disabled = loading;
    if (coBarBtnText) coBarBtnText.hidden = loading;
    if (coBarBtnLoading) coBarBtnLoading.hidden = !loading;
  }

  function showMsg(message) {
    var toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showMsg._t);
    showMsg._t = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  function validateShipping() {
    var name = (document.getElementById("coName") || {}).value || "";
    var phone = (document.getElementById("coPhone") || {}).value || "";
    var address = (document.getElementById("coAddress") || {}).value || "";
    var city = (document.getElementById("coCity") || {}).value || "";

    if (!name.trim()) {
      var el = document.getElementById("coName");
      if (el) el.focus();
      showMsg("Please enter your name.");
      return false;
    }
    if (!phone.trim()) {
      var el2 = document.getElementById("coPhone");
      if (el2) el2.focus();
      showMsg("Please enter your phone number.");
      return false;
    }
    if (!address.trim() || !city.trim()) {
      showMsg("Please enter your delivery address and city.");
      return false;
    }
    var prov = (document.getElementById("coProvince") || {}).value || "";
    if (!prov.trim()) {
      var pv = document.getElementById("coProvince");
      if (pv) pv.focus();
      showMsg("Please select your province.");
      return false;
    }
    return true;
  }

  function validate() {
    return validateShipping();
  }

  function buildOrder() {
    var items = loadCart();
    var name = (document.getElementById("coName") || {}).value || "";
    var phoneV = (document.getElementById("coPhone") || {}).value || "";
    var email = (document.getElementById("coEmail") || {}).value || "";
    var address = (document.getElementById("coAddress") || {}).value || "";
    var city = (document.getElementById("coCity") || {}).value || "";
    var notes = (document.getElementById("coNotes") || {}).value || "";
    var landmark = (document.getElementById("coLandmark") || {}).value || "";
    var province = (document.getElementById("coProvince") || {}).value || "";

    var phone = String(phoneV).replace(/[^\d]/g, "").replace(/^0+/, "");
    var total = cartTotalPrice(items);
    var placedAt = new Date().toISOString();
    var paymentMethod = currentPayment();

    return {
      id: GC && GC.makeOrderId ? GC.makeOrderId() : "GC" + Date.now().toString(36).toUpperCase(),
      placedAt: placedAt,
      updatedAt: placedAt,
      customer: {
        name: name,
        phone: phone,
        email: email,
        address: address,
        city: city,
        province: province,
        landmark: landmark,
        notes: notes
      },
      items: items.map(function (i) {
        return {
          id: i.id,
          name: i.name,
          price: livePrice(i),
          color: i.color,
          image: i.image,
          qty: i.qty
        };
      }),
      total: total,
      payment: {
        method: paymentMethod,
        status: "Pending"
      },
      status: "Pending",
      statusHistory: [{ status: "Pending", at: placedAt, note: "Order placed" }],
      estDelivery: GC && GC.deliveryEstimate ? GC.deliveryEstimate(placedAt, false) : null,
      craftDays: (GC && GC.settings && GC.settings.craftDays) || null,
      deliveryDays: (GC && GC.settings && GC.settings.deliveryDays) || null,
      notifyUpdates: !!(document.getElementById("coNotify") || {}).checked
    };
  }

  function placeOrder() {
    setLoading(true);
    var order = buildOrder();
    var items = order.items;

    // Build the WhatsApp message synchronously so it opens within the
    // user's click (popup blockers allow this).
    var waNum = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
    var shipText = shippingNote(items).text;
    var waMsg =
      "New order *" + order.id + "* from " + (order.customer.name || "Customer") + "\n\n" +
      order.items
        .map(function (i) {
          return "- " + i.name + (i.color ? " (" + i.color + ")" : "") +
            (i.image ? " \u2014 Photo: " + absImage(i.image) : "") +
            " x " + i.qty + " = " + money(livePrice(i) * i.qty);
        })
        .join("\n") +
      "\n\nTotal: " + money(order.total) +
      (shipText ? "\n" + shipText : "") +
      "\nPayment: " + order.payment.method +
      (order.estDelivery ? "\nEst. delivery: " + friendlyDate(order.estDelivery) : "") +
      (order.customer.phone ? "\nPhone: +" + order.customer.phone : "") +
      (order.customer.email ? "\nEmail: " + order.customer.email : "") +
      (order.notifyUpdates ? "\nNotify me about new pieces on WhatsApp: Yes (please add me to your update list)" : "") +
      (order.customer.address
        ? "\nAddress: " + order.customer.address +
          (order.customer.landmark ? "\nLandmark: " + order.customer.landmark : "") +
          "\nCity: " + order.customer.city +
          (order.customer.province ? ", " + order.customer.province : "")
        : "") +
      (order.customer.notes ? "\nNotes: " + order.customer.notes : "");
    var orderWaLink = waNum ? "https://wa.me/" + waNum + "?text=" + encodeURIComponent(waMsg) : "";
    if (orderWaLink) {
      try { window.open(orderWaLink, "_blank", "noopener"); } catch (err) { /* fallback button on success screen */ }
    }

    var done = function () {
      saveCart([]);
      saveProfile();

      setStep(3);
      var pctFill = document.getElementById("checkoutProgressFill");
      if (pctFill) pctFill.style.width = "100%";
      stepDots.forEach(function (d) { d.classList.add("completed"); d.classList.remove("active"); });

      if (success) {
        if (successNo) successNo.textContent = order.id;
        if (successCopy) successCopy.textContent = order.payment.method === "Cash on delivery"
          ? "We've received your order and will confirm it with you on WhatsApp shortly. Please keep " + money(order.total) + " ready to pay on delivery."
          : "We've received your order and will contact you to confirm your payment and delivery.";
        if (successEta) {
          successEta.hidden = !order.estDelivery;
          if (successEtaDate && order.estDelivery) successEtaDate.textContent = friendlyDate(order.estDelivery);
        }
        if (waLinkEl) {
          waLinkEl.href = "";
          waLinkEl.hidden = true;
        }
        success.hidden = false;
      }
      if (formWrap) formWrap.hidden = true;
      if (itemsEl) itemsEl.innerHTML = "";
      if (subtotalEl) subtotalEl.textContent = money(0);

      var wa = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
      if (orderWaLink && waLinkEl) {
        waLinkEl.href = orderWaLink;
        waLinkEl.hidden = false;
        if (waMissingEl) waMissingEl.hidden = true;
      } else if (waMissingEl) {
        waMissingEl.hidden = false;
      }

      setLoading(false);
    };

    if (GC && GC.saveOrder) {
      GC.saveOrder(order).then(function () {
        if (GC && GC.reserveProducts && order.items && order.items.length) {
          GC.reserveProducts(order.items.slice()).catch(function () {});
        }
        done();
      }).catch(function () {
        done();
      });
    } else {
      done();
    }
  }

  /* ---------- auto-fill from saved profile ---------- */
  function autoFillProfile() {
    var profile = GC && GC.getCustomerProfile ? GC.getCustomerProfile() : null;
    if (!profile) return;
    var fields = { coName: "name", coPhone: "phone", coEmail: "email", coAddress: "address", coCity: "city", coLandmark: "landmark", coProvince: "province" };
    Object.keys(fields).forEach(function (fieldId) {
      var el = document.getElementById(fieldId);
      if (el && profile[fields[fieldId]]) el.value = profile[fields[fieldId]];
    });
  }

  /* ---------- save profile after order ---------- */
  function saveProfile() {
    var profile = {
      name: (document.getElementById("coName") || {}).value || "",
      phone: (document.getElementById("coPhone") || {}).value || "",
      email: (document.getElementById("coEmail") || {}).value || "",
      address: (document.getElementById("coAddress") || {}).value || "",
      city: (document.getElementById("coCity") || {}).value || "",
      landmark: (document.getElementById("coLandmark") || {}).value || "",
      province: (document.getElementById("coProvince") || {}).value || ""
    };
    if (GC && GC.saveCustomerProfile) GC.saveCustomerProfile(profile);
  }

  /* ---------- step navigation buttons ---------- */
  var step1Next = document.getElementById("coStep1Next");
  if (step1Next) {
    step1Next.addEventListener("click", function () {
      if (!validateShipping()) return;
      setStep(2);
    });
  }

  var step2Back = document.getElementById("coStep2Back");
  if (step2Back) step2Back.addEventListener("click", function () { setStep(1); });

  var step2Next = document.getElementById("coStep2Next");
  if (step2Next) step2Next.addEventListener("click", function () { setStep(3); });

  var step3Back = document.getElementById("coStep3Back");
  if (step3Back) step3Back.addEventListener("click", function () { setStep(2); });

  if (placeBtn) {
    placeBtn.addEventListener("click", function () {
      if (!validate()) return;
      placeOrder();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (currentStep === 1) {
        if (!validateShipping()) return;
        setStep(2);
      }
    });
  }

  /* ---------- enter key ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && currentStep === 1 && !placeBtn.disabled) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      if (validateShipping()) setStep(2);
    }
  });

  /* ---------- live mini-summary ---------- */
  ["coName", "coPhone", "coAddress", "coCity"].forEach(function (fieldId) {
    var el = document.getElementById(fieldId);
    if (el) el.addEventListener("input", updateStrip);
  });

  function init() {
    renderSummary(loadCart());
    autoFillProfile();
    renderPaymentInfo();
    updateStrip();
    setStep(1);
  }

  if (GC && GC.init) {
    GC.init().then(init);
  } else {
    init();
  }
})();