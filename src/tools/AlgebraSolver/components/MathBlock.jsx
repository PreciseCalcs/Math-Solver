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
    .replace(/\u2208/g, '\\in ') // ∈ -> \in
    .replace(/\u2124/g, '\\mathbb{Z}') // ℤ -> \mathbb{Z}
    .replace(/\u211D/g, '\\mathbb{R}') // ℝ -> \mathbb{R}
    .replace(/\u2115/g, '\\mathbb{N}') // ℕ -> \mathbb{N}
    .replace(/\u21D2/g, '\\implies ') // ⇒ -> \implies
    .replace(/\u21D4/g, '\\iff ') // ⇔ -> \iff
    .replace(/\u03B8/g, '\\theta ') // θ -> \theta
    .replace(/\u03C0/g, '\\pi ') // π -> \pi
    .replace(/\u03B1/g, '\\alpha ') // α -> \alpha
    .replace(/\u03B2/g, '\\beta ') // β -> \beta
    .replace(/\u221A\s*\(([^)]+)\)/g, '\\sqrt{$1}') // √(x) -> \sqrt{x}
    .replace(/\u221A([0-9a-zA-Z]+)/g, '\\sqrt{$1}') // √x -> \sqrt{x}
    .replace(/\u00B2/g, '^2') // ² -> ^2
    .replace(/\u00B3/g, '^3') // ³ -> ^3
    .replace(/\u2074/g, '^4') // ⁴ -> ^4
    .replace(/\u2075/g, '^5') // ⁵ -> ^5
    .replace(/\u2076/g, '^6') // ⁶ -> ^6
    .replace(/\u2077/g, '^7') // ⁷ -> ^7
    .replace(/\u2078/g, '^8') // ⁸ -> ^8
    .replace(/\u2079/g, '^9') // ⁹ -> ^9
    .replace(/\u207B\u00B9/g, '^{-1}') // ⁻¹ -> ^{-1}
    .replace(/\u1D40/g, '^T') // ᵀ -> ^T
    .replace(/\u2080/g, '_0') // ₀ -> _0
    .replace(/\u2081/g, '_1') // ₁ -> _1
    .replace(/\u2082/g, '_2') // ₂ -> _2
    .replace(/\u2083/g, '_3') // ₃ -> _3
    .replace(/\u2084/g, '_4') // ₄ -> _4
    .replace(/\u2085/g, '_5') // ₅ -> _5
    .replace(/\u2086/g, '_6') // ₆ -> _6
    .replace(/\u2087/g, '_7') // ₇ -> _7
    .replace(/\u2088/g, '_8') // ₈ -> _8
    .replace(/\u2089/g, '_9') // ₉ -> _9
    .replace(/\u2099/g, '_n'); // ₙ -> _n

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
 * Checks if a string is purely mathematical (e.g. "x = 2", "2x + 3 = 7", "(-∞, 3) ∪ (5, ∞)", "(3+2i)(1-4i)")
 * without English sentence structure.
 */
function isPureMathString(str) {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed) return false;

  // If it starts with typical sentence starters or has multiple common english words
  const words = trimmed.match(/[a-zA-Z]{3,}/g) || [];
  const mathKeywords = new Set([
    'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'ln', 'exp',
    'det', 'lim', 'gcd', 'lcm', 'deg', 'min', 'max', 'arg', 'mod',
    'frac', 'sqrt', 'left', 'right', 'cdot', 'times', 'div', 'pm',
    'quad', 'qquad', 'text', 'begin', 'cases', 'matrix', 'pmod', 'infty',
    'theta', 'alpha', 'beta', 'gamma', 'lambda', 'sigma', 'pi'
  ]);
  const nonMathWords = words.filter((w) => !mathKeywords.has(w.toLowerCase()));

  // If there are more than 1 non-math words, it is likely natural language commentary
  if (nonMathWords.length > 1) return false;

  // Contains typical math operators or variables
  return /[=<>^_+*/\\{}()\[\]|\u2212\u00D7\u00B7\u00F7\u2264\u2265\u2260\u00B1\u221E\u2208\u2124\u211D\u21D2\u21D4]/.test(trimmed);
}

/**
 * MathText component: Parses and renders mixed text containing LaTeX math formulas.
 * Supports:
 *   - Inline math: \(...\) and $...$
 *   - Display math: \[...\] and $$...$$
 *   - Code backticks: `...`
 *   - Bare LaTeX commands (\sin, \det, \frac, etc.) inside comments
 *   - Pure LaTeX equations or expressions without delimiters
 */
export const MathText = ({ text, inline = false, className = '' }) => {
  const parsedElements = useMemo(() => {
    if (!text) return null;
    const str = String(text);

    // If string is pure LaTeX command or pure math expression without natural words
    const isPureCommand =
      /^\s*(\\(frac|sqrt|sum|int|lim|begin|left|mathbf|text|pm|cfrac|binom|det|sin|cos|tan|log|ln))\b/.test(str);
    if (isPureCommand || isPureMathString(str)) {
      return [<MathBlock key="pure" tex={str} inline={inline} />];
    }

    // Tokenize text for $$, \[\], \(\), $, and `backticks` delimiters
    // Note: Negative lookbehind (?<!\\)\$ ensures escaped \$ is preserved as literal text
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)|(?<!\\)\$.*?(?<!\\)\$|`[^`]+`)/g;
    const elements = [];
    let lastIndex = 0;
    let match;
    let tokenIndex = 0;

    const processPlainSubtext = (plainChunk) => {
      if (!plainChunk) return;
      // Check if plain text contains inline LaTeX commands like \theta, \sin(x), \det(A), k \in \mathbb{Z}, \dots
      const commandRegex = /(\\(?:sin|cos|tan|det|log|ln|theta|pi|alpha|beta|infty|in|mathbb\{[A-Z]\}|le|ge|ne|pm|times|cdot|implies|iff)\b[^\s,;)]*)/g;
      let cmdLast = 0;
      let cmdMatch;

      while ((cmdMatch = commandRegex.exec(plainChunk)) !== null) {
        if (cmdMatch.index > cmdLast) {
          elements.push(
            <span key={`subtxt-${tokenIndex++}`}>{plainChunk.slice(cmdLast, cmdMatch.index)}</span>
          );
        }
        elements.push(
          <MathBlock key={`cmdmath-${tokenIndex++}`} tex={cmdMatch[0]} inline={true} />
        );
        cmdLast = commandRegex.lastIndex;
      }

      if (cmdLast < plainChunk.length) {
        elements.push(
          <span key={`subtxt-${tokenIndex++}`}>{plainChunk.slice(cmdLast)}</span>
        );
      }
    };

    while ((match = regex.exec(str)) !== null) {
      // Text before math token
      if (match.index > lastIndex) {
        processPlainSubtext(str.slice(lastIndex, match.index));
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
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
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
      processPlainSubtext(str.slice(lastIndex));
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
