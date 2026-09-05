import React, { useState } from 'react';
import { Copy, Check, Code, X, Sparkles, Globe, FileCode, CheckCircle2, Info } from 'lucide-react';

const TOOL_DESCRIPTIONS = {
  matrix: {
    name: 'Matrix Calculator',
    desc: 'Step-by-step matrix calculator for addition, multiplication, powers, determinants, inverses, eigenvalues, rank, trace, norms, null space, column space, and LU decomposition with exact fractions.',
  },
  equation: {
    name: 'Equation Solver',
    desc: 'Step-by-step algebraic equation solver supporting linear, quadratic, polynomial, rational equations, absolute value, and algebraic inequalities.',
  },
  system: {
    name: 'System of Equations Solver',
    desc: 'Solve systems of linear equations step-by-step using Gauss-Jordan elimination, Gaussian substitution, Cramer’s rule, and matrix inversion.',
  },
  polynomial: {
    name: 'Polynomial Calculator',
    desc: 'Polynomial arithmetic calculator for polynomial long division, synthetic division, multiplication, addition, and subtraction with full steps.',
  },
  series: {
    name: 'Series & Sequences Calculator',
    desc: 'Calculate arithmetic, geometric, and power series, partial sums, recursive terms, convergence tests, and closed-form expressions step-by-step.',
  },
  complex: {
    name: 'Complex Numbers Calculator',
    desc: 'Calculate complex number arithmetic in rectangular (a + bi), polar (r∠θ), and exponential (r·e^{iθ}) forms with step-by-step conjugate and powers.',
  },
};

export function EmbedModal({ isOpen, onClose, toolTitle = 'Matrix Calculator', toolKey = 'matrix' }) {
  const [activeTab, setActiveTab] = useState('script'); // 'script' | 'webcomponent' | 'iframe'
  const [copied, setCopied] = useState(false);
  const [includeSchema, setIncludeSchema] = useState(true);
  const [embedHeight, setEmbedHeight] = useState('780');
  const [useLiveDomain, setUseLiveDomain] = useState(true);

  if (!isOpen) return null;

  // Live domain is math.precisecalcs.com
  const LIVE_DOMAIN = 'https://math.precisecalcs.com';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : LIVE_DOMAIN;
  const origin = useLiveDomain ? LIVE_DOMAIN : currentOrigin;
  const scriptUrl = `${origin}/calculator-widget.js`;
  const iframeUrl = `${origin}/${toolKey}?embed=true`;

  const meta = TOOL_DESCRIPTIONS[toolKey] || {
    name: toolTitle,
    desc: `Step-by-step mathematical calculator for ${toolTitle}.`,
  };

  // 1. SEO Script Tag Embed Code
  const schemaJson = `{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "${meta.name}",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "All",
  "description": "${meta.desc.replace(/"/g, '\\"')}"
}`;

  const seoScriptCode = `<!-- PreciseCalcs SEO Mathematical Calculator Widget -->
<div class="precisecalcs-embed" data-tool="${toolKey}" data-decimal="false">
  <!-- Crawlable Content & Fallback for Search Engines (Googlebot) -->
  <div class="precisecalcs-seo-fallback" style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; font-family: sans-serif;">
    <h3 style="margin-top: 0; color: #0f172a;">${meta.name} — Step-by-Step Solver</h3>
    <p style="color: #475569; font-size: 0.95rem; line-height: 1.5;">${meta.desc}</p>
    <p style="font-size: 0.85rem; color: #64748b;"><em>Interactive calculator loading... Requires JavaScript enabled.</em></p>
  </div>
</div>
${includeSchema ? `\n<!-- Schema.org Rich Result Structured Data -->\n<script type="application/ld+json">\n${schemaJson}\n</script>\n` : ''}
<!-- Interactive Calculator Script (Mounts directly into your WordPress DOM) -->
<script src="${scriptUrl}" async></script>`;

  // 2. Web Component Embed Code
  const webComponentCode = `<!-- Custom Web Component Embed (Direct in WordPress DOM) -->
<precise-calculator tool="${toolKey}" decimal="false"></precise-calculator>
<script src="${scriptUrl}" async></script>`;

  // 3. Iframe Embed Code (Fallback)
  const iframeCode = `<iframe
  src="${iframeUrl}"
  width="100%"
  height="${embedHeight}"
  frameborder="0"
  scrolling="auto"
  style="border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); width: 100%; min-width: 320px; overflow: hidden;"
  title="${meta.name}"
  allow="clipboard-write">
</iframe>`;

  const getActiveCode = () => {
    if (activeTab === 'script') return seoScriptCode;
    if (activeTab === 'webcomponent') return webComponentCode;
    return iframeCode;
  };

  const copyCurrentCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="as-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="as-modal-dialog"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#fff4ed',
                color: '#c8522a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Code size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Embed in WordPress
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                SEO-optimized script & DOM embedding for WordPress & web pages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: '0 20px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'script' ? '2.5px solid #c8522a' : '2.5px solid transparent',
              color: activeTab === 'script' ? '#c8522a' : '#64748b',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} />
            <span>&lt;script&gt; Tag (SEO Friendly)</span>
            <span
              style={{
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: '700',
              }}
            >
              Recommended
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('webcomponent')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'webcomponent' ? '2.5px solid #c8522a' : '2.5px solid transparent',
              color: activeTab === 'webcomponent' ? '#c8522a' : '#64748b',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileCode size={14} />
            <span>Web Component</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('iframe')}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'iframe' ? '2.5px solid #c8522a' : '2.5px solid transparent',
              color: activeTab === 'iframe' ? '#c8522a' : '#64748b',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Globe size={14} />
            <span>Iframe (Fallback)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {/* SEO Benefits Callout for Script Tag */}
          {activeTab === 'script' && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '14px',
                fontSize: '0.8rem',
                color: '#166534',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong>100% SEO Friendly (No Iframe Barrier):</strong>
                <p style={{ margin: '3px 0 0', lineHeight: '1.45' }}>
                  Mounts the interactive calculator directly into your WordPress post's HTML DOM. Googlebot indexes all keywords, math derivations, and Schema.org rich snippets directly under your domain URL.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'iframe' && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '0.78rem',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Info size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>Note:</strong> Search engines treat iframe content as belonging to the external URL, not your WordPress domain. For full SEO indexing, use the <strong>&lt;script&gt; Tag</strong> tab above.
              </span>
            </div>
          )}

          {/* Domain Host Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '7px 12px',
              marginBottom: '10px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
              <Globe size={14} style={{ color: '#c8522a' }} />
              <span><strong>Script Host:</strong></span>
              <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>
                {origin}
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#475569', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={useLiveDomain}
                onChange={(e) => setUseLiveDomain(e.target.checked)}
              />
              <span>Production (math.precisecalcs.com)</span>
            </label>
          </div>

          {/* Options toolbar */}
          {activeTab === 'script' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <input
                type="checkbox"
                id="schemaToggle"
                checked={includeSchema}
                onChange={(e) => setIncludeSchema(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="schemaToggle" style={{ fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                Include <strong>Schema.org (JSON-LD)</strong> structured data for Google Rich Results
              </label>
            </div>
          )}

          {activeTab === 'iframe' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Height:</label>
              <select
                value={embedHeight}
                onChange={(e) => setEmbedHeight(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                }}
              >
                <option value="650">650px (Compact)</option>
                <option value="780">780px (Standard)</option>
                <option value="920">920px (Spacious)</option>
              </select>
            </div>
          )}

          {/* Code snippet block */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <pre
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                fontSize: '0.76rem',
                lineHeight: '1.48',
                fontFamily: 'JetBrains Mono, monospace',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '260px',
                margin: 0,
              }}
            >
              {getActiveCode()}
            </pre>
            <button
              type="button"
              onClick={copyCurrentCode}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: copied ? '#10b981' : '#334155',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'background 0.15s ease',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* WordPress Installation Instructions */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '0.8rem',
              color: '#475569',
            }}
          >
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '8px' }}>
              How to add to WordPress:
            </strong>
            <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
              <li>
                In your WordPress post or page editor (Gutenberg Block Editor, Elementor, or Classic), add a <strong>Custom HTML</strong> block.
              </li>
              <li>Paste the copied code snippet into the block.</li>
              <li>
                Click <strong>Update</strong> or <strong>Publish</strong>. The calculator will render directly inside your page layout!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Supports all WordPress themes (Astra, GeneratePress, Divi, Kadence, etc.)
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={copyCurrentCode}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: copied ? '#10b981' : '#c8522a',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Embed Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
