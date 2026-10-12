// Apply the saved theme before first paint. No account data is stored here.
(function () {
  var saved;
  try { saved = localStorage.getItem("wayfare-theme"); } catch {}
  document.documentElement.dataset.theme = saved === "light" || saved === "dark"
    ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
})();
