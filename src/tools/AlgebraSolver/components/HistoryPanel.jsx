import React from 'react';
import {
  History,
  RotateCcw,
  Trash2,
  X,
  FunctionSquare,
  Rows3,
  Grid3x3,
  Sigma,
  Hash,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useMathHistory } from '../context/HistoryContext';
import { formatRelativeTime } from '../utils/historyStorage';
import { MathBlock } from './MathBlock';

const TAB_CONFIG = {
  equation: { label: 'Equation', icon: FunctionSquare, color: '#3b82f6', bg: '#eff6ff' },
  system: { label: 'System', icon: Rows3, color: '#8b5cf6', bg: '#f5f3ff' },
  matrix: { label: 'Matrix', icon: Grid3x3, color: '#10b981', bg: '#ecfdf5' },
  series: { label: 'Series', icon: Sigma, color: '#f59e0b', bg: '#fffbeb' },
  complex: { label: 'Complex', icon: Hash, color: '#ec4899', bg: '#fdf2f8' },
};

export const HistoryPanel = () => {
  const {
    history,
    maxCapacity,
    isHistoryOpen,
    setIsHistoryOpen,
    recallProblem,
    removeProblem,
    clearHistory,
  } = useMathHistory();

  if (!isHistoryOpen) return null;

  return (
    <section
      className="as-history-panel"
      aria-label="Recent Math Problems History"
      data-testid="math-history-panel"
    >
      <div className="as-history-header">
        <div className="as-history-title-group">
          <div className="as-history-icon-wrapper" aria-hidden="true">
            <History size={17} />
          </div>
          <div>
            <h3 className="as-history-title">
              History &amp; Recent Problems
              <span className="as-history-counter" data-testid="history-counter-text">
                {history.length}/{maxCapacity}
              </span>
            </h3>
            <p className="as-history-subtitle">
              Saves the last 10 math problems solved in your browser. Click any to recall and re-solve.
            </p>
          </div>
        </div>

        <div className="as-history-header-actions">
          {history.length > 0 && (
            <button
              type="button"
              className="as-history-clear-btn"
              onClick={() => {
                if (window.confirm('Clear all solved math problems from history?')) {
                  clearHistory();
                }
              }}
              title="Clear all saved problems"
              data-testid="history-clear-all-btn"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}

          <button
            type="button"
            className="as-history-close-btn"
            onClick={() => setIsHistoryOpen(false)}
            aria-label="Close history panel"
            data-testid="history-close-btn"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="as-history-body">
        {history.length === 0 ? (
          <div className="as-history-empty" data-testid="history-empty-state">
            <div className="as-history-empty-icon">
              <Clock size={28} strokeWidth={1.5} />
            </div>
            <p className="as-history-empty-title">No math problems solved yet</p>
            <p className="as-history-empty-desc">
              Whenever you solve an equation, system, matrix, series, or complex expression, it will be automatically
              recorded here (up to 10 items) for instant 1-click recall.
            </p>
          </div>
        ) : (
          <div className="as-history-grid" data-testid="history-items-grid">
            {history.map((item, idx) => {
              const conf = TAB_CONFIG[item.tab] || {
                label: item.tab,
                icon: FunctionSquare,
                color: '#6b7280',
                bg: '#f3f4f6',
              };
              const Icon = conf.icon;
              const hasTex = Boolean(item.tex && item.tex.length < 180);

              return (
                <div
                  key={item.id || idx}
                  className="as-history-card"
                  data-testid={`history-item-${idx}`}
                  onClick={() => recallProblem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      recallProblem(item);
                    }
                  }}
                >
                  <div className="as-history-card-header">
                    <span
                      className="as-history-category-badge"
                      style={{ color: conf.color, backgroundColor: conf.bg }}
                    >
                      <Icon size={12} strokeWidth={2.2} />
                      <span>{conf.label}</span>
                    </span>

                    <span className="as-history-timestamp" title={new Date(item.timestamp).toLocaleString()}>
                      {formatRelativeTime(item.timestamp)}
                    </span>

                    <button
                      type="button"
                      className="as-history-item-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProblem(item.id);
                      }}
                      title="Delete from history"
                      aria-label="Remove item"
                      data-testid={`history-delete-item-${idx}`}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="as-history-card-expression">
                    {hasTex ? (
                      <div className="as-history-tex">
                        <MathBlock tex={item.tex} inline={true} />
                      </div>
                    ) : (
                      <div className="as-history-expr-text" title={item.expression}>
                        {item.expression || item.title}
                      </div>
                    )}
                  </div>

                  {item.answer && (
                    <div className="as-history-card-answer" title={item.answer}>
                      <CheckCircle2 size={12} className="as-history-check-icon" />
                      <span className="as-history-answer-label">Solution:</span>
                      <span className="as-history-answer-val">{item.answer}</span>
                    </div>
                  )}

                  <div className="as-history-card-footer">
                    <button
                      type="button"
                      className="as-history-recall-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        recallProblem(item);
                      }}
                      data-testid={`history-recall-btn-${idx}`}
                    >
                      <RotateCcw size={12} />
                      <span>Recall &amp; Re-solve</span>
                      <ArrowRight size={11} className="as-history-arrow" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
