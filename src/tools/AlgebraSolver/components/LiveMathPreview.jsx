import React, { useState } from 'react';
import { CheckCircle2, PenLine, Copy, Check, Zap, Sparkles } from 'lucide-react';
import { toLiveMathTex } from '../engine/liveMath.js';
import { MathBlock } from './MathBlock';

export const LiveMathPreview = ({
  rawInput,
  customTex,
  label = 'Live Math Preview',
  placeholderTex = '2(x - 3) + 5 = 3x - 1',
  isSolving = false,
  autoSolve = true,
  onToggleAutoSolve,
}) => {
  const [copied, setCopied] = useState(false);
  
  const parsed = customTex
    ? {
        tex: customTex,
        isValid: !customTex.includes('\\dots') && customTex.length > 0,
        isTyping: customTex.includes('\\dots'),
        isEmpty: false,
        status: !customTex.includes('\\dots') ? 'valid' : 'typing',
      }
    : toLiveMathTex(rawInput);

  const { tex, isValid, isTyping, isEmpty, status } = parsed;
  const displayTex = isEmpty ? placeholderTex : tex;

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
    <div className={`as-live-preview ${isEmpty ? 'is-empty' : ''} ${isValid ? 'is-valid' : ''}`} data-testid="live-math-preview">
      <div className="as-live-header">
        <div className="as-live-title-group">
          <div className="as-live-pulse-icon" aria-hidden="true">
            <Sparkles size={14} className="text-amber-600" />
          </div>
          <span className="as-live-title">{label}</span>
        </div>

        <div className="as-live-actions">
          {/* Status badge */}
          {isEmpty ? (
            <span className="as-live-badge badge-empty" data-testid="live-status-empty">
              <span className="badge-dot" /> Waiting for input
            </span>
          ) : isValid ? (
            <span className="as-live-badge badge-valid" data-testid="live-status-valid">
              <CheckCircle2 size={12} className="badge-icon" /> Valid math
            </span>
          ) : (
            <span className="as-live-badge badge-typing" data-testid="live-status-typing">
              <PenLine size={12} className="badge-icon" /> Typing...
            </span>
          )}

          {/* Auto-solve status / toggle */}
          {onToggleAutoSolve && (
            <button
              type="button"
              className={`as-auto-solve-btn ${autoSolve ? 'active' : ''} ${isSolving ? 'is-solving' : ''}`}
              onClick={onToggleAutoSolve}
              title={autoSolve ? 'Live auto-solve is enabled' : 'Click to enable live auto-solve'}
              data-testid="live-autosolve-toggle"
            >
              <Zap size={11} />
              <span>{autoSolve ? 'Live Solve' : 'Manual'}</span>
            </button>
          )}

          {/* Copy LaTeX button */}
          {!isEmpty && (
            <button
              type="button"
              className="as-copy-latex-btn"
              onClick={handleCopyLatex}
              title="Copy formatted LaTeX to clipboard"
              data-testid="copy-latex-btn"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'LaTeX'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="as-live-content">
        <div className="as-live-formula">
          <MathBlock tex={displayTex} />
        </div>
        {isEmpty && (
          <p className="as-live-hint">
            Type or click symbols above — your equation formats here instantly in KaTeX.
          </p>
        )}
      </div>
    </div>
  );
};
