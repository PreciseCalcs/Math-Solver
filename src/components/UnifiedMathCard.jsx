import React, { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, PenLine, Copy, Check, Zap, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toLiveMathTex } from '../tools/AlgebraSolver/engine/liveMath.js';
import { MathBlock } from '../tools/AlgebraSolver/components/MathBlock';

/**
 * Universal "Unified Input + Live Math Card" component
 * Designed for embedding into WordPress sites and responsive mobile viewports.
 * Reusable across Algebra, Calculus, Trigonometry, and other math tools.
 */
export const UnifiedMathCard = ({
  id = 'unified-math-input',
  label = 'Equation / Expression',
  value = '',
  onChange,
  onKeyDown,
  onSolve,
  placeholder = 'e.g.  2(x - 3) + 5 = 3x - 1',
  placeholderTex = '2(x - 3) + 5 = 3x - 1',
  customTex,
  inputRef: externalRef,
  isSolving = false,
  autoSolve = true,
  onToggleAutoSolve,
  examples = [],
  onSelectExample,
  inputTools = true,
  hint,
  className = '',
}) => {
  const internalRef = useRef(null);
  const activeRef = externalRef || internalRef;
  const [isFocused, setIsFocused] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse into KaTeX or use custom override
  const parsed = customTex
    ? {
        tex: customTex,
        isValid: !customTex.includes('\\dots') && customTex.length > 0,
        isTyping: customTex.includes('\\dots'),
        isEmpty: false,
        status: !customTex.includes('\\dots') ? 'valid' : 'typing',
      }
    : toLiveMathTex(value);

  const { tex, isValid, isTyping, isEmpty } = parsed;
  const displayTex = isEmpty ? placeholderTex : tex;

  // Move cursor left/right (touchscreen assist)
  const stepCursor = (delta) => {
    const el = activeRef?.current;
    if (!el) return;
    const currentPos = el.selectionStart ?? value.length;
    const nextPos = Math.max(0, Math.min(value.length, currentPos + delta));
    el.focus();
    el.setSelectionRange(nextPos, nextPos);
  };

  // Clear input
  const handleClear = () => {
    if (onChange) onChange('');
    activeRef?.current?.focus();
  };

  // Copy LaTeX
  const handleCopyLatex = async () => {
    if (!displayTex) return;
    try {
      await navigator.clipboard.writeText(displayTex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`as-unified-card ${isFocused ? 'is-focused' : ''} ${isValid ? 'is-valid' : ''} ${isEmpty ? 'is-empty' : ''} ${className}`}
      data-testid="unified-math-card"
    >
      {/* CARD HEADER & TOOLBAR */}
      <div className="as-unified-header">
        <div className="as-unified-header-left">
          <div className="as-unified-icon" aria-hidden="true">
            <Sparkles size={14} />
          </div>
          <label htmlFor={id} className="as-unified-title">
            {label}
          </label>

          {/* Status Badge */}
          {isEmpty ? (
            <span className="as-unified-badge badge-empty" data-testid="unified-status-empty">
              <span className="badge-dot" /> Waiting for input
            </span>
          ) : isValid ? (
            <span className="as-unified-badge badge-valid" data-testid="unified-status-valid">
              <CheckCircle2 size={12} className="badge-icon" /> Valid math
            </span>
          ) : (
            <span className="as-unified-badge badge-typing" data-testid="unified-status-typing">
              <PenLine size={12} className="badge-icon" /> Typing...
            </span>
          )}
        </div>

        {/* Action controls */}
        <div className="as-unified-actions">
          {inputTools && (
            <>
              {/* Mobile cursor navigation */}
              <div className="as-cursor-controls" title="Move cursor left/right">
                <button
                  type="button"
                  className="as-cursor-btn"
                  onClick={() => stepCursor(-1)}
                  aria-label="Cursor left"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  className="as-cursor-btn"
                  onClick={() => stepCursor(1)}
                  aria-label="Cursor right"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              {value && (
                <button
                  type="button"
                  className="as-unified-clear-btn"
                  onClick={handleClear}
                  title="Clear expression"
                  aria-label="Clear expression"
                >
                  <X size={12} />
                  <span>Clear</span>
                </button>
              )}
            </>
          )}

          {/* Live Auto-Solve Toggle */}
          {onToggleAutoSolve && (
            <button
              type="button"
              className={`as-auto-solve-btn ${autoSolve ? 'active' : ''} ${isSolving ? 'is-solving' : ''}`}
              onClick={onToggleAutoSolve}
              title={autoSolve ? 'Live auto-solve is enabled' : 'Click to enable live auto-solve'}
              data-testid="unified-autosolve-toggle"
            >
              <Zap size={11} />
              <span>{autoSolve ? 'Live Solve' : 'Manual'}</span>
            </button>
          )}

          {/* Copy LaTeX */}
          {!isEmpty && (
            <button
              type="button"
              className="as-copy-latex-btn"
              onClick={handleCopyLatex}
              title="Copy formatted LaTeX to clipboard"
              data-testid="unified-copy-latex-btn"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'LaTeX'}</span>
            </button>
          )}
        </div>
      </div>

      {/* RAW INPUT FIELD ROW (TOP TIER) */}
      <div className="as-unified-input-row">
        <input
          id={id}
          ref={activeRef}
          type="text"
          className="as-unified-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSolve) {
              e.preventDefault();
              onSolve();
            }
            onKeyDown?.(e);
          }}
          autoComplete="off"
          spellCheck={false}
          data-testid="unified-math-input"
        />
      </div>

      {/* REFINED DIVIDER CONNECTOR */}
      <div className="as-unified-divider">
        <span className="as-unified-divider-label">Live Formatted Math</span>
      </div>

      {/* LIVE MATH PREVIEW STAGE (BOTTOM TIER) */}
      <div className="as-unified-preview-stage" data-testid="unified-preview-stage">
        {!isEmpty ? (
          <div className="as-unified-math-block">
            <MathBlock tex={displayTex} />
          </div>
        ) : (
          <p className="as-unified-hint" data-testid="unified-placeholder-hint">
            Formatted mathematical notation will appear here as you type.
          </p>
        )}
        {hint && <p className="as-unified-hint">{hint}</p>}
      </div>

      {/* OPTIONAL EXAMPLES TRAY */}
      {examples && examples.length > 0 && (
        <div className="as-examples" style={{ padding: '8px 14px', margin: 0, borderTop: '1px solid #f2e8dd' }}>
          <span className="as-examples-label">Try:</span>
          {examples.map((ex, i) => {
            const exVal = typeof ex === 'string' ? ex : ex.value;
            const exLbl = typeof ex === 'string' ? ex : ex.label;
            return (
              <button
                key={i}
                type="button"
                className="as-example-chip"
                onClick={() => onSelectExample?.(exVal)}
              >
                {exLbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
