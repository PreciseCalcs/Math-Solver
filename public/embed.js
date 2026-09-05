/**
 * PreciseCalcs Mathematical Suite — SEO-Friendly Script Loader
 * Usage:
 *   <div class="precisecalcs-embed" data-tool="matrix"></div>
 *   <script src="https://your-domain/embed.js" async></script>
 */
(function() {
  const currentScript = document.currentScript || document.querySelector('script[src*="embed.js"]');
  const scriptSrc = currentScript ? currentScript.src : '';
  const baseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) : '';
  const widgetUrl = baseUrl ? `${baseUrl}/calculator-widget.js` : '/calculator-widget.js';

  // Check if widget script is already loaded
  if (window.PreciseCalcsWidget || window.PreciseCalcs) {
    if (window.PreciseCalcs && window.PreciseCalcs.init) {
      window.PreciseCalcs.init();
    }
    return;
  }

  // Load calculator-widget.js
  const script = document.createElement('script');
  script.src = widgetUrl;
  script.async = true;
  script.onload = function() {
    if (window.PreciseCalcs && window.PreciseCalcs.init) {
      window.PreciseCalcs.init();
    }
  };
  document.head.appendChild(script);
})();
