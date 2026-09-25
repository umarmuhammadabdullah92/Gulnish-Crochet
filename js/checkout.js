/* =========================================================
   Gulnish Crochet — checkout page logic (one-step order)
   Only 3 required details, then a single "Place Order" tap.
   ========================================================= */

(function () {
  "use strict";

  var GC = window.GC;
  var CART_KEY = "gulnish-cart";

  var DEFAULT_PAYMENT = "Cash on delivery";

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

  function field(id) {
    var el = document.getElementById(id);
    return (el && el.value) || "";
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
    return checked ? checked.value : DEFAULT_PAYMENT;
  }

  /* Delivery charge and date are confirmed on WhatsApp, never quoted here. */

  /* The single free-text address usually ends with the city,
     so keep the admin panel's City column populated for free. */
  function cityFromAddress(address) {
    var parts = String(address || "")
      .split(/[,\n]/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (parts.length < 2) return "";
    var last = parts[parts.length - 1];
    return last.length <= 40 ? last : "";
  }

  /* ---------- elements ---------- */
  var itemsEl = document.getElementById("coItems");
  var subtotalEl = document.getElementById("coSubtotal");
  var emptyWrap = document.getElementById("coEmpty");
  var formWrap = document.getElementById("coForm");
  var form = document.getElementById("coFormEl");
  var placeBtn = document.getElementById("coPlace");
  var success = document.getElementById("coSuccess");
  var successNo = document.getElementById("coSuccessNo");
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
  var payGroup = document.getElementById("coPaymentGroup");
  var payInfo = document.getElementById("coPaymentInfo");
  var moreToggle = document.getElementById("coMoreToggle");
  var moreWrap = document.getElementById("coMore");

  /* ---------- order summary ---------- */
  function renderSummary(items) {
    if (!items.length) {
      if (itemsEl) itemsEl.innerHTML = "";
      if (subtotalEl) subtotalEl.textContent = money(0);
      var emptyShip = document.getElementById("coShipping");
      if (emptyShip) emptyShip.hidden = true;
      if (emptyWrap) emptyWrap.hidden = false;
      if (formWrap) formWrap.hidden = true;
      setBarVisible(false);
      return;
    }
    if (emptyWrap) emptyWrap.hidden = true;
    if (formWrap) formWrap.hidden = false;

    if (itemsEl) {
      itemsEl.innerHTML = items
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
    if (subtotalEl) subtotalEl.textContent = money(sub);
    if (coBarTotal) coBarTotal.textContent = money(sub + (parseFloat(shippingNote(items).amount) || 0));

    var shipEl = document.getElementById("coShipping");
    if (shipEl) {
      var ship = shippingNote(items);
      shipEl.textContent = ship.text;
      shipEl.hidden = !ship.text;
    }

    var stripEta = document.getElementById("coStripEta");
    if (stripEta) {
      var eta = GC && GC.deliveryEstimate ? GC.deliveryEstimate(new Date().toISOString(), false) : "";
      stripEta.textContent = eta ? friendlyDate(eta) : "On confirmation";
    }

    setBarVisible(true);
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
    payGroup.addEventListener("change", renderPaymentInfo);
  }

  /* ---------- optional extras toggle ---------- */
  if (moreToggle && moreWrap) {
    moreToggle.addEventListener("click", function () {
      var open = moreWrap.hidden;
      moreWrap.hidden = !open;
      moreToggle.setAttribute("aria-expanded", String(open));
      moreToggle.classList.toggle("is-open", open);
    });
  }

  /* ---------- validation ---------- */
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

  function validate() {
    var checks = [
      { id: "coName", test: function (v) { return v.trim().length > 1; }, msg: "Please enter your name." },
      { id: "coPhone", test: function (v) { return v.replace(/\D/g, "").length >= 10; }, msg: "Please enter a valid WhatsApp number." },
      { id: "coAddress", test: function (v) { return v.trim().length > 9; }, msg: "Please enter your full delivery address." }
    ];

    for (var i = 0; i < checks.length; i++) {
      var el = document.getElementById(checks[i].id);
      if (!el) continue;
      var ok = checks[i].test(el.value || "");
      el.classList.toggle("co-invalid", !ok);
      if (!ok) {
        el.focus();
        showMsg(checks[i].msg);
        return false;
      }
    }
    return true;
  }

  function setLoading(loading) {
    if (placeBtn) placeBtn.disabled = loading;
    if (btnText) btnText.hidden = loading;
    if (btnLoading) btnLoading.hidden = !loading;
    if (coBarBtn) coBarBtn.disabled = loading;
    if (coBarBtnText) coBarBtnText.hidden = loading;
    if (coBarBtnLoading) coBarBtnLoading.hidden = !loading;
  }

  /* ---------- build + place ---------- */
  function buildOrder() {
    var items = loadCart();
    var name = field("coName").trim();
    var phoneV = field("coPhone");
    var address = field("coAddress").trim();
    var notes = field("coNotes").trim();

    var phone = phoneV.replace(/[^\d]/g, "").replace(/^0+/, "");
    var total = cartTotalPrice(items);
    var placedAt = new Date().toISOString();

    return {
      id: GC && GC.makeOrderId ? GC.makeOrderId() : "GC" + Date.now().toString(36).toUpperCase(),
      placedAt: placedAt,
      updatedAt: placedAt,
      customer: {
        name: name,
        phone: phone,
        email: "",
        address: address,
        city: cityFromAddress(address),
        province: "",
        landmark: "",
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
        method: currentPayment(),
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
    if (!validate()) return;

    setLoading(true);
    var order = buildOrder();
    var items = order.items;

    /* Build the WhatsApp message synchronously so it opens within the
       user's click (popup blockers allow this). */
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
      (order.notifyUpdates ? "\nNotify me about new pieces on WhatsApp: Yes (please add me to your update list)" : "") +
      (order.customer.address
        ? "\nAddress: " + order.customer.address +
          (order.customer.city ? " (" + order.customer.city + ")" : "")
        : "") +
      (order.customer.notes ? "\nNotes: " + order.customer.notes : "");
    var orderWaLink = waNum ? "https://wa.me/" + waNum + "?text=" + encodeURIComponent(waMsg) : "";
    if (orderWaLink) {
      try { window.open(orderWaLink, "_blank", "noopener"); } catch (err) { /* fallback button on success screen */ }
    }

    var done = function () {
      saveCart([]);
      saveProfile();

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
      setBarVisible(false);
      if (itemsEl) itemsEl.innerHTML = "";
      if (subtotalEl) subtotalEl.textContent = money(0);

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
    var fields = {
      coName: "name",
      coPhone: "phone",
      coAddress: "address"
    };
    Object.keys(fields).forEach(function (fieldId) {
      var el = document.getElementById(fieldId);
      if (el && profile[fields[fieldId]]) el.value = profile[fields[fieldId]];
    });
  }

  /* ---------- save profile after order ---------- */
  function saveProfile() {
    var profile = {
      name: field("coName").trim(),
      phone: field("coPhone").replace(/[^\d]/g, "").replace(/^0+/, ""),
      address: field("coAddress").trim(),
      city: cityFromAddress(field("coAddress")),
      landmark: "",
      province: ""
    };
    if (GC && GC.saveCustomerProfile) GC.saveCustomerProfile(profile);
  }

  /* ---------- wiring ---------- */
  function submit() { placeOrder(); }

  if (placeBtn) placeBtn.addEventListener("click", submit);
  if (coBarBtn) coBarBtn.addEventListener("click", submit);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submit();
    });
  }

  /* clear the error ring as soon as the shopper fixes the field */
  ["coName", "coPhone", "coAddress"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { el.classList.remove("co-invalid"); });
  });

  function init() {
    renderSummary(loadCart());
    autoFillProfile();
    renderPaymentInfo();
  }

  if (GC && GC.init) {
    GC.init().then(init);
  } else {
    init();
  }
})();
