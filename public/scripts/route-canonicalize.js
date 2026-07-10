(function routeCanonicalize() {
  if (window.location.pathname.endsWith(".html")) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname.slice(0, -5) + window.location.search + window.location.hash,
    );
  }
})();
