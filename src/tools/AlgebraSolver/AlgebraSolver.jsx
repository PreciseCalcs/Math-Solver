import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FunctionSquare, Rows3, Grid3x3, Divide, Sigma, Hash, Share2, X, History, Code } from 'lucide-react';
import 'katex/dist/katex.min.css';
import './AlgebraSolver.css';
import { EquationTab } from './tabs/EquationTab';
import { SystemTab } from './tabs/SystemTab';
import { MatrixTab } from './tabs/MatrixTab';
import { PolynomialTab } from './tabs/PolynomialTab';
import { SeriesTab } from './tabs/SeriesTab';
import { ComplexTab } from './tabs/ComplexTab';
import { HistoryProvider, useMathHistory } from './context/HistoryContext';
import { HistoryPanel } from './components/HistoryPanel';
import { ToolSuiteHeader } from '../../components/ToolSuiteHeader';
import { EmbedModal } from '../../components/EmbedModal';

const TABS = [
  { key: 'equation', label: 'Equation', icon: FunctionSquare, Component: EquationTab },
  { key: 'system', label: 'System', icon: Rows3, Component: SystemTab },
  { key: 'matrix', label: 'Matrix', icon: Grid3x3, Component: MatrixTab },
  { key: 'polynomial', label: 'Polynomial', icon: Divide, Component: PolynomialTab },
  { key: 'series', label: 'Series', icon: Sigma, Component: SeriesTab },
  { key: 'complex', label: 'Complex', icon: Hash, Component: ComplexTab },
];

function SolverCard({ tab, handleTabChange, decimal, setDecimal, onOpenEmbed }) {
  const { history, isHistoryOpen, setIsHistoryOpen } = useMathHistory();
  const Active = TABS.find((t) => t.key === tab).Component;

  return (
    <div className="as-card">
      <div className="as-toolbar">
        <div className="as-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`as-history-trigger-btn ${isHistoryOpen ? 'active' : ''}`}
            onClick={() => setIsHistoryOpen((v) => !v)}
            aria-expanded={isHistoryOpen}
            data-testid="history-toggle-btn"
            title="View last 10 solved math problems"
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
            onClick={onOpenEmbed}
            title="Get embed code for WordPress or any website"
            data-testid="embed-trigger-btn"
          >
            <Code size={14} />
            <span>Embed</span>
          </button>
        </div>

        <div className="as-toolbar-right">
          <label className="as-toggle" data-testid="decimal-toggle">
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

      {/* Expandable History Drawer / Panel */}
      <HistoryPanel />

      <nav className="as-tabs" data-testid="solver-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`as-tab ${tab === key ? 'active' : ''}`}
            data-testid={`tab-${key}`}
            onClick={() => handleTabChange(key)}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <Active decimal={decimal} />
    </div>
  );
}

export default function AlgebraSolver() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const isEmbed = searchParams.get('embed') === 'true' || searchParams.get('embed') === '1';
  const initialTab = TABS.some((t) => t.key === urlTab) ? urlTab : 'equation';
  const initialDecimal = searchParams.get('dec') === '1';

  const [tab, setTab] = useState(initialTab);
  const [decimal, setDecimal] = useState(initialDecimal);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [showSharedNotice, setShowSharedNotice] = useState(
    Boolean(searchParams.get('q') || searchParams.get('eqs') || searchParams.get('mat') || searchParams.get('mode'))
  );

  const handleTabChange = (newTab) => {
    setTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', newTab);
    setSearchParams(nextParams, { replace: true });
  };

  const activeTabConfig = TABS.find((t) => t.key === tab);

  return (
    <div className={`algebra-solver ${isEmbed ? 'as-embed-root' : ''}`} data-testid="algebra-solver">
      {!isEmbed && <ToolSuiteHeader />}
      <main className={`as-main ${isEmbed ? 'as-embed-main' : ''}`} style={isEmbed ? { padding: '8px 4px 16px' } : {}}>
        {showSharedNotice && (
          <div className="as-shared-notice" data-testid="shared-problem-notice">
            <div className="as-shared-notice-content">
              <Share2 size={15} className="as-shared-notice-icon" />
              <span>
                <strong>Shared Problem Loaded:</strong> Solution derivation has been restored from your shared link.
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

        <HistoryProvider currentTab={tab} onTabChange={handleTabChange}>
          <SolverCard
            tab={tab}
            handleTabChange={handleTabChange}
            decimal={decimal}
            setDecimal={setDecimal}
            onOpenEmbed={() => setIsEmbedModalOpen(true)}
          />
        </HistoryProvider>
      </main>

      <EmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        toolTitle={`${activeTabConfig?.label || 'Algebra'} Calculator`}
        toolKey={tab}
      />
    </div>
  );
}
