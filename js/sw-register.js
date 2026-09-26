/* Kept out of the page markup so the site can ship a Content-Security-Policy
   without needing script-src 'unsafe-inline'. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}
