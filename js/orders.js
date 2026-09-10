/* =========================================================
   Gulnish Crochet — customer orders page logic (advanced)
   ========================================================= */

(function () {
  "use strict";

  var GC = window.GC;

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

  function dateLabel(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return "";
    }
  }

  function normalizePhone(p) {
    return String(p || "").replace(/[^\d]/g, "").replace(/^0+/, "");
  }

  var STATUS_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];
  var STATUS_CANCELLED = "Cancelled";

  function getStepIndex(status) {
    var s = (status || "Pending").toLowerCase();
    if (s === "cancelled") return -1;
    for (var i = 0; i < STATUS_STEPS.length; i++) {
      if (STATUS_STEPS[i].toLowerCase() === s) return i;
    }
    return 0;
  }

  function statusIcon(status) {
    var s = (status || "").toLowerCase();
    if (s === "pending") return "&#128276;";
    if (s === "confirmed") return "&#10003;";
    if (s === "processing") return "&#9881;";
    if (s === "shipped") return "&#128666;";
    if (s === "delivered") return "&#127873;";
    if (s === "cancelled") return "&#10007;";
    return "&#8226;";
  }

  var listEl = document.getElementById("orderList");
  var emptyEl = document.getElementById("orderEmpty");
  var lookupWrap = document.getElementById("orderLookupWrap");
  var phoneInput = document.getElementById("orderPhone");
  var lookupBtn = document.getElementById("orderLookup");
  var emptyMsg = document.getElementById("orderEmptyMsg");
  var refreshIndicator = document.getElementById("refreshIndicator");

  var _lastPhone = "";
  var _autoRefreshTimer = null;

  function renderTimeline(status) {
    var idx = getStepIndex(status);
    var isCancelled = (status || "").toLowerCase() === "cancelled";

    var html = '<div class="order-timeline' + (isCancelled ? " order-timeline--cancelled" : "") + '">';
    STATUS_STEPS.forEach(function (step, i) {
      var state = "";
      if (isCancelled) state = "order-timeline__step--cancelled";
      else if (i < idx) state = "order-timeline__step--done";
      else if (i === idx) state = "order-timeline__step--current";
      else state = "order-timeline__step--upcoming";

      html += '<div class="order-timeline__step ' + state + '">' +
        '<span class="order-timeline__dot">' + statusIcon(step) + '</span>' +
        '<span class="order-timeline__label">' + step + '</span>' +
      '</div>';
    });
    if (isCancelled) {
      html += '<div class="order-timeline__step order-timeline__step--cancelled">' +
        '<span class="order-timeline__dot">' + statusIcon(STATUS_CANCELLED) + '</span>' +
        '<span class="order-timeline__label">Cancelled</span>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function render(orders) {
    var list = orders || [];
    if (!listEl) return;
    if (!list.length) {
      if (emptyEl) emptyEl.hidden = false;
      listEl.innerHTML = "";
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = list
      .map(function (o) {
        var cust = o.customer || {};
        var items = (o.items || [])
          .map(function (i) {
            return '<div class="order-item-row">' +
              '<span class="order-item-row__name">' + escapeHtml(i.name) +
                (i.color ? " <span class='order-item-row__color'>(" + escapeHtml(i.color) + ")</span>" : "") +
              '</span>' +
              '<span class="order-item-row__qty">x' + i.qty + '</span>' +
              '<span class="order-item-row__price">' + money((i.price || 0) * i.qty) + '</span>' +
            '</div>';
          })
          .join("");

        var timeline = renderTimeline(o.status);

        return (
          '<article class="order-card reveal">' +
          '<div class="order-card__head">' +
          "<div>" +
          '<h3 class="order-card__id">Order ' + escapeHtml(o.id) + "</h3>" +
          '<span class="order-card__date">' + escapeHtml(dateLabel(o.placedAt)) + "</span>" +
          "</div>" +
          '<span class="order-status order-status--' + (o.status || "pending").toLowerCase().replace(/[^a-z0-9]+/g, "-") + '">' +
          escapeHtml(o.status || "Pending") + "</span>" +
          "</div>" +
          timeline +
          '<div class="order-card__body">' +
          '<div class="order-card__col">' +
          '<span class="order-card__label">Items</span>' +
          '<div class="order-card__items">' + (items || "<span class='muted'>&mdash;</span>") + "</div>" +
          "</div>" +
          '<div class="order-card__col">' +
          '<span class="order-card__label">Delivery</span>' +
          '<p class="order-card__cust">' +
          escapeHtml(cust.name) + "<br>" +
          (escapeHtml(cust.phone) ? "Ph: +" + escapeHtml(cust.phone) : "") +
          (cust.city ? "<br>" + escapeHtml(cust.city) : "") +
          (cust.address ? '<br><span class="muted">' + escapeHtml(cust.address) + '</span>' : "") +
          (cust.notes ? '<br><em class="muted">' + escapeHtml(cust.notes) + '</em>' : "") +
          "</p>" +
          "</div>" +
          "</div>" +
          '<div class="order-card__foot">' +
          "<span>" + escapeHtml(o.payment || "") + "</span>" +
          '<span class="order-card__total">' + money(o.total) + "</span>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    var revealEls = listEl.querySelectorAll(".reveal");
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
        { threshold: 0.1 }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("revealed"); });
    }
  }

  function lookup() {
    var phone = phoneInput ? phoneInput.value.trim() : "";
    var norm = normalizePhone(phone);
    if (!norm) {
      if (lookupWrap) lookupWrap.classList.add("has-error");
      if (emptyMsg) emptyMsg.textContent = "Please enter the phone number you used at checkout.";
      render([]);
      return;
    }
    if (lookupWrap) lookupWrap.classList.remove("has-error");

    _lastPhone = norm;
    var orders = GC && GC.getOrdersByPhone ? GC.getOrdersByPhone(phone) : [];
    if (emptyMsg) {
      emptyMsg.textContent = orders.length
        ? ""
        : "No orders found for that number.";
    }
    render(orders);

    if (!_autoRefreshTimer) {
      _autoRefreshTimer = setInterval(function () {
        if (_lastPhone) {
          var freshOrders = GC && GC.getOrdersByPhone ? GC.getOrdersByPhone(_lastPhone) : [];
          render(freshOrders);
          showRefreshPulse();
        }
      }, 30000);
    }
  }

  function showRefreshPulse() {
    if (!refreshIndicator) return;
    refreshIndicator.classList.add("pulse");
    setTimeout(function () { refreshIndicator.classList.remove("pulse"); }, 1000);
  }

  if (lookupBtn) {
    lookupBtn.addEventListener("click", lookup);
  }
  if (phoneInput) {
    phoneInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") lookup();
    });
    /* auto-lookup if URL has phone param */
    var urlPhone = new URLSearchParams(location.search).get("phone");
    if (urlPhone) {
      phoneInput.value = urlPhone;
      setTimeout(lookup, 300);
    }
  }

  function init() {
    render([]);
  }

  if (GC && GC.init) {
    GC.init().then(init);
  } else {
    init();
  }
})();
