import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { MatrixTab } from './tools/AlgebraSolver/tabs/MatrixTab';
import { EquationTab } from './tools/AlgebraSolver/tabs/EquationTab';
import { SystemTab } from './tools/AlgebraSolver/tabs/SystemTab';
import { PolynomialTab } from './tools/AlgebraSolver/tabs/PolynomialTab';
import { SeriesTab } from './tools/AlgebraSolver/tabs/SeriesTab';
import { ComplexTab } from './tools/AlgebraSolver/tabs/ComplexTab';
import { HistoryProvider } from './tools/AlgebraSolver/context/HistoryContext';
import widgetStyles from './tools/AlgebraSolver/AlgebraSolver.css';

const TOOLS = {
  matrix: { title: 'Matrix Calculator', Component: MatrixTab },
  equation: { title: 'Equation Solver', Component: EquationTab },
  equations: { title: 'Equation Solver', Component: EquationTab },
  system: { title: 'System of Equations Solver', Component: SystemTab },
  systems: { title: 'System of Equations Solver', Component: SystemTab },
  'system-of-equations': { title: 'System of Equations Solver', Component: SystemTab },
  polynomial: { title: 'Polynomial Calculator', Component: PolynomialTab },
  series: { title: 'Series & Sequences Calculator', Component: SeriesTab },
  complex: { title: 'Complex Numbers Calculator', Component: ComplexTab },
};

function CalculatorWidget({ toolKey = 'matrix', decimal = false }) {
  const normalizedKey = (toolKey || 'matrix').toLowerCase().trim();
  const tool = TOOLS[normalizedKey] || TOOLS.matrix;
  const ActiveComponent = tool.Component;

  return (
    <MemoryRouter>
      <div
        className="algebra-solver precise-calcs-app as-embed-root as-embed-widget"
        style={{ width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}
      >
        <HistoryProvider currentTab={normalizedKey}>
          <div className="as-card as-embed-card" style={{ width: '100%', boxSizing: 'border-box' }}>
            <ActiveComponent decimal={decimal} />
          </div>
        </HistoryProvider>
      </div>
    </MemoryRouter>
  );
}

function injectStyles() {
  if (typeof document === 'undefined') return;

  // 1. Inject KaTeX stylesheet
  if (!document.getElementById('precisecalcs-katex-css')) {
    const link = document.createElement('link');
    link.id = 'precisecalcs-katex-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
    document.head.appendChild(link);
  }

  // 2. Inject Google Fonts
  if (!document.getElementById('precisecalcs-fonts-css')) {
    const link = document.createElement('link');
    link.id = 'precisecalcs-fonts-css';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  // 3. Inject calculator widget CSS
  if (!document.getElementById('precisecalcs-widget-css')) {
    const style = document.createElement('style');
    style.id = 'precisecalcs-widget-css';
    style.textContent = widgetStyles;
    document.head.appendChild(style);
  }
}

export function mountCalculator(target, options = {}) {
  injectStyles();
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return null;

  const toolKey =
    options.tool ||
    element.getAttribute('data-tool') ||
    element.getAttribute('data-calculator') ||
    'matrix';
  const decimal =
    options.decimal ??
    (element.getAttribute('data-decimal') === 'true' ||
      element.getAttribute('data-dec') === '1');

  // If container has SEO placeholder content, preserve or clear
  const root = createRoot(element);
  root.render(<CalculatorWidget toolKey={toolKey} decimal={decimal} />);
  return root;
}

export function initAllCalculators() {
  if (typeof document === 'undefined') return;
  injectStyles();

  const selectors = [
    '.precisecalcs-embed',
    '.precisecalcs-calculator',
    '[data-precisecalcs-calculator]',
    '[data-calculator]',
    '[data-tool]',
  ];

  const targets = document.querySelectorAll(selectors.join(', '));

  targets.forEach((target) => {
    // Avoid re-mounting or mounting on internal elements
    if (target.dataset.mounted || target.closest('.as-embed-widget')) return;
    target.dataset.mounted = 'true';

    const tool =
      target.getAttribute('data-tool') ||
      target.getAttribute('data-calculator') ||
      target.getAttribute('data-precisecalcs-calculator') ||
      'matrix';
    const decimal =
      target.getAttribute('data-decimal') === 'true' ||
      target.getAttribute('data-dec') === '1';

    mountCalculator(target, { tool, decimal });
  });
}

// Register Web Component <precise-calculator tool="matrix"></precise-calculator>
if (typeof window !== 'undefined' && 'customElements' in window) {
  if (!customElements.get('precise-calculator')) {
    class PreciseCalculatorElement extends HTMLElement {
      connectedCallback() {
        if (this.dataset.mounted) return;
        this.dataset.mounted = 'true';
        injectStyles();
        const tool = this.getAttribute('tool') || 'matrix';
        const decimal = this.getAttribute('decimal') === 'true';
        mountCalculator(this, { tool, decimal });
      }
    }
    customElements.define('precise-calculator', PreciseCalculatorElement);
  }
}

// Global API on window
if (typeof window !== 'undefined') {
  window.PreciseCalcs = {
    mount: mountCalculator,
    init: initAllCalculators,
  };
}

// Auto-init on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCalculators);
  } else {
    initAllCalculators();
  }
}

export default {
  mountCalculator,
  initAllCalculators,
};
