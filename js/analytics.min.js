/* =========================================================
   Gulnish Crochet — Analytics loader (GA4 + Meta Pixel)

   Put your IDs in js/config.js under window.GC_ANALYTICS and
   they load here automatically. Leave empty to stay untagged.
   ========================================================= */
(function () {
  "use strict";
  var cfg = (window.GC_ANALYTICS) || {};

  if (cfg.ga4 && !window.gtag) {
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4);
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", cfg.ga4);
  }

  if (cfg.meta && !window.fbq) {
    var f = document.createElement("script");
    f.async = true;
    f.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(f);

    window.fbq = window.fbq = window.fbq || function () {
      (fbq.q = fbq.q || []).push(arguments);
    };
    fbq("init", cfg.meta);
    fbq("track", "PageView");

    var n = document.createElement("noscript");
    var img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = "https://www.facebook.com/tr?id=" + encodeURIComponent(cfg.meta) + "&ev=PageView&noscript=1";
    n.appendChild(img);
    document.body.appendChild(n);
  }
})();