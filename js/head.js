/* Loaded as a blocking script in <head>, before the stylesheets, so the
   "js" class lands on <html> before first paint.

   css/style.css only hides .reveal when html.js is set. That keeps reveal
   content visible when scripting is off or the bundle fails, but means a
   late-running script would flash hidden content. The setTimeout is a safety
   net: js/script.js normally sets window.__gcRevealReady once the observer is
   wired up, and this only forces everything visible if that never happens. */
document.documentElement.classList.add("js");

window.addEventListener("load", function () {
  setTimeout(function () {
    if (window.__gcRevealReady) return;
    var els = document.querySelectorAll(".reveal");
    for (var i = 0; i < els.length; i++) els[i].classList.add("revealed");
  }, 1500);
});
