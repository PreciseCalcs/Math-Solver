/**
 * PreciseCalcs Tools Embed Script
 * Usage: <script src="https://your-domain.vercel.app/embed.js?tool=binary-translator"></script>
 */

(function() {
  // Get script parameters
  const currentScript = document.currentScript || document.querySelector('script[src*="embed.js"]');
  const params = new URLSearchParams(currentScript.src.split('?')[1] || '');
  const tool = params.get('tool') || 'binary-translator';
  const containerId = params.get('container') || 'precisecalcs-tool';
  
  // Get base URL from script source
  const scriptSrc = currentScript.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  
  // Create iframe container
  const container = document.getElementById(containerId) || document.currentScript.parentElement;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${baseUrl}/${tool}`;
  iframe.style.width = '100%';
  iframe.style.minHeight = '800px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  iframe.title = 'PreciseCalcs Tool';
  
  // Auto-resize iframe based on content
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'resize' && e.origin === new URL(baseUrl).origin) {
      iframe.style.height = e.data.height + 'px';
    }
  });
  
  // Insert iframe
  container.appendChild(iframe);
})();
