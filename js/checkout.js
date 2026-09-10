/* =========================================================
   Gulnish Crochet — checkout page logic (professional build)
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

  function cartTotalPrice(items) {
    return items.reduce(
      function (sum, item) { return sum + (parseFloat(item.price) || 0) * item.qty; },
      0
    );
  }

  function currentPayment() {
    var checked = document.querySelector('input[name="coPayment"]:checked');
    return checked ? checked.value : PAYMENT_METHODS[0];
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
  var successEta = document.getElementById("coSuccessEta");
  var successEtaDate = document.getElementById("coSuccessEtaDate");
  var successCopy = document.getElementById("coSuccessCopy");
  var trackLink = document.getElementById("coTrackLink");
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
  var step3 = document.getElementById("step3");
  var progressFill = document.getElementById("checkoutProgressFill");
  var stepDots = document.querySelectorAll(".checkout-step-dot");

  var currentStep = 1;

  function setStep(step) {
    currentStep = step;

    if (step1) step1.hidden = step !== 1;
    if (step3) step3.hidden = step !== 3;

    var pct = step === 3 ? 100 : 50;
    if (progressFill) progressFill.style.width = pct + "%";

    stepDots.forEach(function (dot, i) {
      var s = i + 1;
      dot.classList.toggle("active", s <= step);
      dot.classList.toggle("completed", s < step);
    });

    updateBar();
  }

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
      setBarVisible(false);
      return;
    }
    if (coBarTotal) coBarTotal.textContent = money(cartTotalPrice(items));
    if (coBarBtnText) coBarBtnText.textContent = "Place Order";
    if (coBarBtnLoading) coBarBtnLoading.hidden = true;
    if (coBarBack) coBarBack.hidden = true;
    setBarVisible(true);
  }

  /* ---------- auto-fill from saved profile ---------- */
  function autoFillProfile() {
    var profile = GC && GC.getCustomerProfile ? GC.getCustomerProfile() : null;
    if (!profile) return;
    var fields = { coName: "name", coPhone: "phone", coEmail: "email", coAddress: "address", coCity: "city" };
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
      city: (document.getElementById("coCity") || {}).value || ""
    };
    if (GC && GC.saveCustomerProfile) GC.saveCustomerProfile(profile);
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

  /* ---------- order summary ---------- */
  function renderSummary(items) {
    if (!itemsEl) return;
    if (!items.length) {
      if (itemsEl) itemsEl.innerHTML = "";
      if (subtotalEl) subtotalEl.textContent = money(0);
      if (emptyWrap) emptyWrap.hidden = false;
      if (formWrap) formWrap.hidden = true;
      updateBar();
      return;
    }
    if (emptyWrap) emptyWrap.hidden = true;
    if (formWrap) formWrap.hidden = false;
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
          '<div class="co-item__price">' + money(item.price * item.qty) + "</div>" +
          "</div>"
        );
      })
      .join("");
    if (subtotalEl) subtotalEl.textContent = money(cartTotalPrice(items));
    updateBar();
  }

  function renderReview() {
    var reviewItems = document.getElementById("coReviewItems");
    var reviewTotal = document.getElementById("coReviewTotal");
    var reviewCustomer = document.getElementById("coReviewCustomer");
    var reviewPayment = document.getElementById("coReviewPayment");
    var reviewEta = document.getElementById("coReviewEta");
    var items = loadCart();

    if (reviewItems) {
      reviewItems.innerHTML = items.map(function (item) {
        return '<div class="co-review-item">' +
          '<span class="co-review-item__name">' + escapeHtml(item.name) + (item.color ? " (" + escapeHtml(item.color) + ")" : "") + '</span>' +
          '<span class="co-review-item__qty">x' + item.qty + '</span>' +
          '<span class="co-review-item__price">' + money(item.price * item.qty) + '</span>' +
        '</div>';
      }).join("");
    }

    if (reviewTotal) reviewTotal.textContent = money(cartTotalPrice(items));

    if (reviewCustomer) {
      var name = (document.getElementById("coName") || {}).value || "";
      var phone = (document.getElementById("coPhone") || {}).value || "";
      var address = (document.getElementById("coAddress") || {}).value || "";
      var city = (document.getElementById("coCity") || {}).value || "";
      reviewCustomer.innerHTML =
        '<p><strong>' + escapeHtml(name) + '</strong></p>' +
        '<p>' + escapeHtml(phone) + '</p>' +
        '<p>' + escapeHtml(address) + (city ? ", " + escapeHtml(city) : "") + '</p>';
    }

    if (reviewPayment) {
      var method = currentPayment();
      var payStatus = method === "Cash on delivery" ? "Pay on delivery" : "Awaiting payment";
      reviewPayment.textContent = method + " &mdash; " + payStatus;
    }

    if (reviewEta) {
      var eta = GC && GC.deliveryEstimate ? GC.deliveryEstimate(new Date().toISOString(), false) : "";
      reviewEta.textContent = eta ? friendlyDate(eta) : "";
    }
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
    showMsg._t = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  function validate() {
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
      var el = document.getElementById("coPhone");
      if (el) el.focus();
      showMsg("Please enter your phone number.");
      return false;
    }
    if (!address.trim() || !city.trim()) {
      showMsg("Please enter your delivery address and city.");
      return false;
    }
    return true;
  }

  function placeOrder() {
    setLoading(true);
    var items = loadCart();
    var name = (document.getElementById("coName") || {}).value || "";
    var phoneV = (document.getElementById("coPhone") || {}).value || "";
    var email = (document.getElementById("coEmail") || {}).value || "";
    var address = (document.getElementById("coAddress") || {}).value || "";
    var city = (document.getElementById("coCity") || {}).value || "";
    var notes = (document.getElementById("coNotes") || {}).value || "";

    var phone = String(phoneV).replace(/[^\d]/g, "").replace(/^0+/, "");
    var total = cartTotalPrice(items);
    var placedAt = new Date().toISOString();
    var paymentMethod = currentPayment();

    var order = {
      id: GC && GC.makeOrderId ? GC.makeOrderId() : "GC" + Date.now().toString(36).toUpperCase(),
      placedAt: placedAt,
      updatedAt: placedAt,
      customer: {
        name: name,
        phone: phone,
        email: email,
        address: address,
        city: city,
        notes: notes
      },
      items: items.map(function (i) {
        return {
          id: i.id,
          name: i.name,
          price: parseFloat(i.price) || 0,
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
      deliveryDays: (GC && GC.settings && GC.settings.deliveryDays) || null
    };

    var done = function () {
      saveCart([]);
      saveProfile();

      setStep(3);

      if (success) {
        if (successNo) successNo.textContent = order.id;
        if (successCopy) successCopy.textContent = order.payment.method === "Cash on delivery"
          ? "We've received your order and will confirm it with you on WhatsApp shortly. Please keep " + money(order.total) + " ready to pay on delivery."
          : "We've received your order and will contact you to confirm your payment and delivery.";
        if (successEta) {
          successEta.hidden = !order.estDelivery;
          if (successEtaDate && order.estDelivery) successEtaDate.textContent = friendlyDate(order.estDelivery);
        }
        if (trackLink && order.id) trackLink.href = "orders.html?id=" + encodeURIComponent(order.id);
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
      if (wa && waLinkEl) {
        var msg =
          "New order *" + order.id + "* from " + order.customer.name + "\n\n" +
          order.items
            .map(function (i) {
              return "- " + i.name + (i.color ? " (" + i.color + ")" : "") +
                " x " + i.qty + " = " + money(i.price * i.qty);
            })
            .join("\n") +
          "\n\nTotal: " + money(order.total) +
          "\nPayment: " + order.payment.method +
          (order.estDelivery ? "\nEst. delivery: " + friendlyDate(order.estDelivery) : "") +
          (phone ? "\nPhone: +" + phone : "") +
          (email ? "\nEmail: " + email : "") +
          (address ? "\nAddress: " + address + (city ? ", " + city : "") : "") +
          (notes ? "\nNotes: " + notes : "");
        waLinkEl.href =
          "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg);
        waLinkEl.hidden = false;
        if (waMissingEl) waMissingEl.hidden = true;
      } else if (waMissingEl) {
        waMissingEl.hidden = false;
      }

      setLoading(false);
    };

    if (GC && GC.saveOrder) {
      GC.saveOrder(order).then(function () {
        done();
      }).catch(function () {
        done();
      });
    } else {
      done();
    }
  }

  /* ---------- step 1 -> step 2 ---------- */
  if (nextToReviewBtn) {
    nextToReviewBtn.addEventListener("click", function () {
      if (!validate()) return;
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- step 2 -> step 1 (back) ---------- */
  if (backToDetailsBtn) {
    backToDetailsBtn.addEventListener("click", function () {
      setStep(1);
    });
  }

  /* ---------- place order (from review step) ---------- */
  if (placeBtn) {
    placeBtn.addEventListener("click", function (e) {
      placeOrder();
    });
  }

  /* ---------- mobile sticky action bar ---------- */
  if (coBarBtn) {
    coBarBtn.addEventListener("click", function () {
      if (currentStep === 1) {
        if (!validate()) return;
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (currentStep === 2) {
        placeOrder();
      }
    });
  }
  if (coBarBack) {
    coBarBack.addEventListener("click", function () {
      setStep(1);
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (currentStep === 1) {
        if (!validate()) return;
        setStep(2);
      } else if (currentStep === 2) {
        placeOrder();
      }
    });
  }

  /* ---------- enter key advances steps ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && currentStep === 2 && !placeBtn.disabled) {
      e.preventDefault();
      placeOrder();
    }
  });

  function init() {
    renderSummary(loadCart());
    autoFillProfile();
    renderPaymentInfo();
    setStep(1);
  }

  if (GC && GC.init) {
    GC.init().then(init);
  } else {
    init();
  }
})();