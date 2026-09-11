/* =========================================================
   Gulnish Crochet — customer order tracking (professional)
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

  function dateTimeLabel(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return "";
    }
  }

  function shortDate(iso) {
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

  function normalizePhone(p) {
    return String(p || "").replace(/[^\d]/g, "").replace(/^0+/, "");
  }

  var STATUS_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];
  var STATUS_CANCELLED = "Cancelled";

  function getStepIndex(status) {
    var s = (status || "Pending").toLowerCase();
    if (s === STATUS_CANCELLED.toLowerCase()) return -1;
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
  var queryInput = document.getElementById("orderPhone");
  var lookupBtn = document.getElementById("orderLookup");
  var emptyMsg = document.getElementById("orderEmptyMsg");
  var refreshIndicator = document.getElementById("refreshIndicator");

  var _lastQuery = "";
  var _autoRefreshTimer = null;

  /* find orders by order number OR phone number */
  function findOrders(value) {
    if (GC && GC.getOrderById) {
      var byId = GC.getOrderById(value);
      if (byId) return [byId];
    }
    if (GC && GC.getOrdersByPhone) {
      return GC.getOrdersByPhone(value);
    }
    return [];
  }

  function historyDate(history, status) {
    if (!Array.isArray(history)) return "";
    var wanted = String(status || "").toLowerCase();
    var entry = history.find(function (h) { return String(h.status || "").toLowerCase() === wanted; });
    return entry && entry.at ? entry.at : "";
  }

  function renderTimeline(status, history) {
    var idx = getStepIndex(status);
    var isCancelled = (status || "").toLowerCase() === STATUS_CANCELLED.toLowerCase();

    var html = '<div class="order-timeline' + (isCancelled ? " order-timeline--cancelled" : "") + '">';
    STATUS_STEPS.forEach(function (step, i) {
      var state = "";
      if (isCancelled) state = "order-timeline__step--cancelled";
      else if (i < idx) state = "order-timeline__step--done";
      else if (i === idx) state = "order-timeline__step--current";
      else state = "order-timeline__step--upcoming";

      var when = historyDate(history, step);
      html += '<div class="order-timeline__step ' + state + '">' +
        '<span class="order-timeline__dot">' + statusIcon(step) + '</span>' +
        '<span class="order-timeline__label">' + step + '</span>' +
        (when ? '<span class="order-timeline__date">' + escapeHtml(dateTimeLabel(when)) + '</span>' : "") +
      '</div>';
    });
    if (isCancelled) {
      var cancelWhen = historyDate(history, STATUS_CANCELLED);
      html += '<div class="order-timeline__step order-timeline__step--cancelled">' +
        '<span class="order-timeline__dot">' + statusIcon(STATUS_CANCELLED) + '</span>' +
        '<span class="order-timeline__label">Cancelled</span>' +
        (cancelWhen ? '<span class="order-timeline__date">' + escapeHtml(dateTimeLabel(cancelWhen)) + '</span>' : "") +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function payBadge(payment) {
    var pay = payment || {};
    var method = pay.method || "Cash on delivery";
    if (String(pay.status || "").toLowerCase() === "paid") {
      return '<span class="pay-badge pay-badge--paid">Paid</span>';
    }
    if (method.toLowerCase() === "cash on delivery") {
      return '<span class="pay-badge pay-badge--pending">Pay on delivery</span>';
    }
    return '<span class="pay-badge pay-badge--pending">Awaiting payment</span>';
  }

  function render(orders) {
    var list = orders || [];
    if (!listEl) return;
    if (list.length && emptyEl) emptyEl.hidden = true;
    if (!list.length) {
      if (emptyEl) emptyEl.hidden = false;
      listEl.innerHTML = "";
      return;
    }

    listEl.innerHTML = list
      .map(function (o) {
        var cust = o.customer || {};
        var pay = o.payment || {};
        var items = (o.items || [])
          .map(function (i) {
            var line = '<div class="order-item-row">' +
              '<span class="order-item-row__img">' +
              (i.image ? '<img src="' + i.image + '" alt="" loading="lazy" decoding="async">' : "<span>&#128722;</span>") +
              "</span>" +
              '<span class="order-item-row__name">' + escapeHtml(i.name) +
                (i.color ? " <span class='order-item-row__color'>(" + escapeHtml(i.color) + ")</span>" : "") +
              '</span>' +
              '<span class="order-item-row__qty">x' + i.qty + '</span>' +
              '<span class="order-item-row__price">' + money((i.price || 0) * i.qty) + '</span>' +
            '</div>';
            return line;
          })
          .join("");

        var timeline = renderTimeline(o.status, o.statusHistory);

        var canShowEst = o.estDelivery &&
          String(o.status || "").toLowerCase() !== "delivered" &&
          String(o.status || "").toLowerCase() !== "cancelled";

        var wa = GC && GC.shopWhatsApp ? GC.shopWhatsApp() : "";
        var helpMsg = "Hi Gulnish Crochet, I have a question about my order *" + (o.id || "") + "*.";

        return (
          '<article class="order-card reveal">' +
          '<header class="order-card__top">' +
          "<div>" +
          '<span class="order-card__kicker">Order number</span>' +
          '<h3 class="order-card__id">' + escapeHtml(o.id) + "</h3>" +
          '<span class="order-card__date">Placed ' + escapeHtml(shortDate(o.placedAt)) + " at " + escapeHtml(compactTime(o.placedAt)) + "</span>" +
          "</div>" +
          '<div class="order-card__hmeta">' +
          '<span class="order-status order-status--' + (o.status || "pending").toLowerCase().replace(/[^a-z0-9]+/g, "-") + '">' +
          escapeHtml(o.status || "Pending") + "</span>" +
          (canShowEst ? '<span class="order-card__eta">Estimated delivery <b>' + escapeHtml(shortDate(o.estDelivery)) + "</b></span>" : "") +
          "</div>" +
          "</header>" +
          timeline +
          '<div class="order-card__body">' +
          '<div class="order-card__section">' +
          '<span class="order-card__label">Items (' + (o.items || []).length + ")</span>" +
          '<div class="order-card__items">' + (items || "<span class='muted'>&mdash;</span>") + "</div>" +
          "</div>" +
          '<div class="order-card__cols">' +
          '<div class="order-card__col">' +
          '<span class="order-card__label">Delivery to</span>' +
          '<p class="order-card__cust">' +
          escapeHtml(cust.name || "Customer") +
          (cust.phone ? "<br>+" + escapeHtml(cust.phone) : "") +
          (cust.city ? "<br>" + escapeHtml(cust.city) : "") +
          (cust.address ? '<br><span class="muted">' + escapeHtml(cust.address) + '</span>' : "") +
          (cust.notes ? '<br><em class="muted">' + escapeHtml(cust.notes) + '</em>' : "") +
          "</p>" +
          "</div>" +
          '<div class="order-card__col">' +
          '<span class="order-card__label">Payment</span>' +
          '<span class="order-card__pay-method">' + escapeHtml(pay.method || "Cash on delivery") + "</span>" +
          payBadge(pay) +
          "</div>" +
          "</div>" +
          '<div class="order-card__total-row">' +
          '<span class="order-card__label">Order total</span>' +
          '<span class="order-card__total">' + money(o.total) + "</span>" +
          "</div>" +
          "</div>" +
          '<footer class="order-card__foot">' +
          (wa
            ? '<a class="btn btn--wa order-card__help" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(helpMsg) + '" target="_blank" rel="noopener">WhatsApp us</a>'
            : "") +
          (cust.phone
            ? '<a class="btn btn--ghost order-card__help" href="tel:+' + escapeHtml(cust.phone) + '">Call us</a>'
            : "") +
          "</footer>" +
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

  function compactTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function runLookup(value) {
    if (GC && GC.lookupOrders) {
      return Promise.resolve(GC.lookupOrders(value)).then(function (found) { return found || []; });
    }
    return Promise.resolve(findOrders(value));
  }

  function lookup() {
    var value = queryInput ? queryInput.value.trim() : "";
    if (!value) {
      if (lookupWrap) lookupWrap.classList.add("has-error");
      if (emptyMsg) emptyMsg.textContent = "Please enter your order number or phone number.";
      render([]);
      return;
    }
    if (lookupWrap) lookupWrap.classList.remove("has-error");

    _lastQuery = value;
    runLookup(value).then(function (found) {
      if (emptyMsg) {
        emptyMsg.textContent = found.length
          ? ""
          : "No orders found. Check the order number or phone number and try again.";
      }
      render(found);
    });

    if (!_autoRefreshTimer) {
      _autoRefreshTimer = setInterval(function () {
        if (_lastQuery) {
          runLookup(_lastQuery).then(function (found) { render(found); });
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
  if (queryInput) {
    queryInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") lookup();
    });
    /* auto-lookup if URL has phone or id param */
    var params = new URLSearchParams(location.search);
    var idParam = params.get("id");
    var phoneParam = params.get("phone");
    if (idParam) {
      queryInput.value = idParam;
      setTimeout(lookup, 300);
    } else if (phoneParam) {
      queryInput.value = phoneParam;
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