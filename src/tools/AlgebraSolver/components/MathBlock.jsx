import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

/**
 * Standard LaTeX math macros for KaTeX rendering
 */
export const KATEX_MACROS = {
  '\\implies': '\\Rightarrow',
  '\\iff': '\\Leftrightarrow',
  '\\to': '\\rightarrow',
  '\\R': '\\mathbb{R}',
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\C': '\\mathbb{C}',
  '\\Q': '\\mathbb{Q}',
  '\\d': '\\mathrm{d}',
  '\\bold': '\\mathbf',
};

/**
 * Normalizes and cleans LaTeX formulas before rendering in KaTeX.
 * Handles outer delimiters, unicode mathematical symbols, and common spacing.
 */
export function cleanTex(raw) {
  if (raw === null || raw === undefined) return '';
  let s = String(raw).trim();
  if (!s) return '';

  // Strip outer delimiters if present: $$, \[\], \(\), or single $
  if ((s.startsWith('$$') && s.endsWith('$$')) || (s.startsWith('\\[') && s.endsWith('\\]'))) {
    s = s.slice(2, -2).trim();
  } else if ((s.startsWith('\\(') && s.endsWith('\\)')) || (s.startsWith('$') && s.endsWith('$') && s.length > 2)) {
    s = s.slice(s.startsWith('$') ? 1 : 2, s.endsWith('$') ? -1 : -2).trim();
  }

  // Normalize unicode math symbols into standard LaTeX equivalents
  s = s
    .replace(/\u2212/g, '-') // Unicode minus sign (−) -> ASCII hyphen (-)
    .replace(/\u00D7/g, '\\times ') // × -> \times
    .replace(/\u00B7/g, '\\cdot ') // · -> \cdot
    .replace(/\u00F7/g, '\\div ') // ÷ -> \div
    .replace(/\u2264/g, '\\le ') // ≤ -> \le
    .replace(/\u2265/g, '\\ge ') // ≥ -> \ge
    .replace(/\u2260/g, '\\ne ') // ≠ -> \ne
    .replace(/\u00B1/g, '\\pm ') // ± -> \pm
    .replace(/\u221E/g, '\\infty ') // ∞ -> \infty
    .replace(/\u221A\s*\(([^)]+)\)/g, '\\sqrt{$1}') // √(x) -> \sqrt{x}
    .replace(/\u221A([0-9a-zA-Z]+)/g, '\\sqrt{$1}') // √x -> \sqrt{x}
    .replace(/\u00B2/g, '^2') // ² -> ^2
    .replace(/\u00B3/g, '^3') // ³ -> ^3
    .replace(/\u2074/g, '^4') // ⁴ -> ^4
    .replace(/\u2075/g, '^5') // ⁵ -> ^5
    .replace(/\u2076/g, '^6') // ⁶ -> ^6
    .replace(/\u2077/g, '^7') // ⁷ -> ^7
    .replace(/\u2078/g, '^8') // ⁸ -> ^8
    .replace(/\u2079/g, '^9'); // ⁹ -> ^9

  return s;
}

/**
 * Safely renders LaTeX to HTML using KaTeX
 */
export function renderLatexSafe(rawTex, options = {}) {
  const { inline = false, displayMode = !inline, macros = KATEX_MACROS } = options;
  const cleaned = cleanTex(rawTex);
  if (!cleaned) return '';

  try {
    return katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      errorColor: '#dc2626',
      strict: false,
      trust: true,
      macros,
    });
  } catch (err) {
    console.warn('KaTeX render fallback for:', rawTex, err);
    return `<span class="as-katex-raw-fallback">${escapeHtml(cleaned)}</span>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * MathBlock component: Renders a pure LaTeX formula as display or inline math.
 * Includes copy-as-LaTeX support and responsive horizontal scroll container.
 */
export const MathBlock = ({
  tex,
  inline = false,
  copyable = false,
  className = '',
  ariaLabel,
  title,
}) => {
  const [copied, setCopied] = useState(false);
  const cleaned = useMemo(() => cleanTex(tex), [tex]);

  const html = useMemo(() => {
    return renderLatexSafe(cleaned, { inline });
  }, [cleaned, inline]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!cleaned) return;
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!cleaned) return null;

  if (inline) {
    return (
      <span
        className={`as-math-inline ${className}`.trim()}
        title={title || cleaned}
        aria-label={ariaLabel || cleaned}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className={`as-math-display-container ${copyable ? 'is-copyable' : ''} ${className}`.trim()}
      title={title}
    >
      <div
        className="as-math-display as-math-scroll"
        aria-label={ariaLabel || cleaned}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {copyable && (
        <button
          type="button"
          className="as-math-copy-btn"
          onClick={handleCopy}
          title="Copy LaTeX formula"
          aria-label="Copy LaTeX formula"
        >
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'LaTeX'}</span>
        </button>
      )}
    </div>
  );
};

/**
 * MathText component: Parses and renders mixed text containing LaTeX math formulas.
 * Supports:
 *   - Inline math: \(...\) and $...$
 *   - Display math: \[...\] and $$...$$
 *   - Pure LaTeX equations without delimiters
 */
export const MathText = ({ text, inline = false, className = '' }) => {
  const parsedElements = useMemo(() => {
    if (!text) return null;
    const str = String(text);

    // If string is pure LaTeX commands without surrounding text (starts with \frac, \sqrt, \begin, etc.)
    const isPureCommand =
      /^\s*(\\(frac|sqrt|sum|int|lim|begin|left|mathbf|text|pm|cfrac|binom))\b/.test(str);
    if (isPureCommand) {
      return [<MathBlock key="pure" tex={str} inline={inline} />];
    }

    // Tokenize text for $$, \[\], \(\), and $ delimiters
    // Note: Negative lookbehind (?<!\\)\$ ensures escaped \$ is preserved as literal text
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)|(?<!\\)\$.*?(?<!\\)\$)/g;
    const elements = [];
    let lastIndex = 0;
    let match;
    let tokenIndex = 0;

    while ((match = regex.exec(str)) !== null) {
      // Text before math token
      if (match.index > lastIndex) {
        elements.push(
          <span key={`txt-${tokenIndex++}`}>
            {str.slice(lastIndex, match.index)}
          </span>
        );
      }

      const raw = match[0];
      let isBlock = false;
      let mathContent = raw;

      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        isBlock = true;
        mathContent = raw.slice(2, -2).trim();
      } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
        isBlock = true;
        mathContent = raw.slice(2, -2).trim();
      } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
        isBlock = false;
        mathContent = raw.slice(2, -2).trim();
      } else if (raw.startsWith('$') && raw.endsWith('$')) {
        isBlock = false;
        mathContent = raw.slice(1, -1).trim();
      }

      elements.push(
        <MathBlock
          key={`math-${tokenIndex++}`}
          tex={mathContent}
          inline={!isBlock}
        />
      );

      lastIndex = regex.lastIndex;
    }

    // Trailing text
    if (lastIndex < str.length) {
      elements.push(
        <span key={`txt-${tokenIndex++}`}>{str.slice(lastIndex)}</span>
      );
    }

    return elements;
  }, [text, inline]);

  if (!parsedElements) return null;

  return (
    <span className={`as-math-text ${inline ? 'is-inline' : ''} ${className}`.trim()}>
      {parsedElements}
    </span>
  );
};

export default MathBlock;
