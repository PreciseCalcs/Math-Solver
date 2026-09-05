import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Share2, X, History, ArrowLeft, Sparkles, Code } from 'lucide-react';
import 'katex/dist/katex.min.css';
import '../tools/AlgebraSolver/AlgebraSolver.css';
import { ToolSuiteHeader } from '../components/ToolSuiteHeader';
import { HistoryProvider, useMathHistory } from './AlgebraSolver/context/HistoryContext';
import { HistoryPanel } from './AlgebraSolver/components/HistoryPanel';
import { EmbedModal } from '../components/EmbedModal';

const TAB_ROUTES = {
  equation: '/equations',
  system: '/system-of-equations',
  matrix: '/matrix',
  polynomial: '/polynomial',
  series: '/series',
  complex: '/complex',
};

function StandaloneContent({
  toolKey,
  title,
  subtitle,
  category,
  icon: Icon,
  color = '#c8522a',
  badgeText = 'Standalone Tool',
  children,
  decimal,
  setDecimal,
  isEmbed,
}) {
  const [searchParams] = useSearchParams();
  const { history, isHistoryOpen, setIsHistoryOpen } = useMathHistory();
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [showSharedNotice, setShowSharedNotice] = useState(
    Boolean(
      searchParams.get('q') ||
      searchParams.get('eqs') ||
      searchParams.get('mat') ||
      searchParams.get('mode')
    )
  );

  return (
    <div
      className={`as-standalone-page ${isEmbed ? 'as-embed-page' : ''}`}
      data-testid="standalone-tool-page"
      style={isEmbed ? { minHeight: 'auto', background: 'transparent' } : {}}
    >
      <main className={`as-main ${isEmbed ? 'as-embed-main' : ''}`} style={isEmbed ? { padding: '8px 4px 16px' } : {}}>
        {/* Tool Header Banner - only shown when not embedded or as compact in embed */}
        {!isEmbed ? (
          <div className="as-standalone-hero" style={{ '--tool-accent': color }}>
            <div className="as-standalone-hero-top">
              <Link to="/tools" className="as-back-link" title="Return to tools directory">
                <ArrowLeft size={14} />
                <span>All Tools</span>
              </Link>
              <div className="as-standalone-pills">
                <span className="as-category-pill">{category}</span>
                <span className="as-status-pill">{badgeText}</span>
              </div>
            </div>

            <div className="as-standalone-hero-content">
              <div className="as-standalone-hero-icon" style={{ background: color }}>
                <Icon size={24} />
              </div>
              <div>
                <h1 className="as-standalone-hero-title">{title}</h1>
                <p className="as-standalone-hero-subtitle">{subtitle}</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            marginBottom: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={15} />
              </div>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>
                {title}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
              {category}
            </span>
          </div>
        )}

        {/* Shared Problem Link Alert */}
        {showSharedNotice && (
          <div className="as-shared-notice" data-testid="shared-problem-notice">
            <div className="as-shared-notice-content">
              <Share2 size={15} className="as-shared-notice-icon" />
              <span>
                <strong>Shared Problem Loaded:</strong> Input parameters have been restored from your shared link.
              </span>
            </div>
            <button
              type="button"
              className="as-shared-notice-dismiss"
              onClick={() => setShowSharedNotice(false)}
              aria-label="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Solver Workstation Card */}
        <div className={`as-card as-standalone-card ${isEmbed ? 'as-embed-card' : ''}`}>
          <div className="as-toolbar">
            <div className="as-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`as-history-trigger-btn ${isHistoryOpen ? 'active' : ''}`}
                onClick={() => setIsHistoryOpen((v) => !v)}
                aria-expanded={isHistoryOpen}
                data-testid="history-toggle-btn"
                title="View recent solved math problems"
              >
                <History size={15} />
                <span>History</span>
                {history.length > 0 && (
                  <span className="as-history-badge" data-testid="history-badge-count">
                    {history.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="as-history-trigger-btn"
                onClick={() => setIsEmbedModalOpen(true)}
                title="Get WordPress or website embed code"
                data-testid="embed-trigger-btn"
              >
                <Code size={14} />
                <span>Embed</span>
              </button>
            </div>

            <div className="as-toolbar-right">
              <label className="as-toggle" data-testid="decimal-toggle" title="Toggle exact fractions vs decimal results">
                <span>Decimal</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={decimal}
                  className={`as-switch ${decimal ? 'on' : ''}`}
                  onClick={() => setDecimal((d) => !d)}
                >
                  <span className="as-switch-thumb" />
                </button>
              </label>
            </div>
          </div>

          {/* Expandable History Drawer */}
          <HistoryPanel />

          {/* Active Tool Tab Interface */}
          <div className="as-standalone-tool-body">
            {React.cloneElement(children, { decimal })}
          </div>
        </div>
      </main>

      {/* Embed Code Modal */}
      <EmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        toolTitle={title}
        toolKey={toolKey}
      />
    </div>
  );
}

export function StandaloneToolLayout({
  toolKey,
  title,
  subtitle,
  category,
  icon,
  color,
  badgeText,
  children,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEmbed = searchParams.get('embed') === 'true' || searchParams.get('embed') === '1';
  const initialDecimal = searchParams.get('dec') === '1';
  const [decimal, setDecimalState] = useState(initialDecimal);

  const setDecimal = (valOrFn) => {
    setDecimalState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const nextParams = new URLSearchParams(searchParams);
      if (next) {
        nextParams.set('dec', '1');
      } else {
        nextParams.delete('dec');
      }
      setSearchParams(nextParams, { replace: true });
      return next;
    });
  };

  const handleTabChange = (targetTab) => {
    if (TAB_ROUTES[targetTab]) {
      navigate(TAB_ROUTES[targetTab]);
    }
  };

  return (
    <div className={`algebra-solver precise-calcs-app ${isEmbed ? 'as-embed-root' : ''}`} data-testid={`tool-${toolKey}`}>
      {!isEmbed && <ToolSuiteHeader />}
      <HistoryProvider currentTab={toolKey} onTabChange={handleTabChange}>
        <StandaloneContent
          toolKey={toolKey}
          title={title}
          subtitle={subtitle}
          category={category}
          icon={icon}
          color={color}
          badgeText={badgeText}
          decimal={decimal}
          setDecimal={setDecimal}
          isEmbed={isEmbed}
        >
          {children}
        </StandaloneContent>
      </HistoryProvider>
    </div>
  );
}
