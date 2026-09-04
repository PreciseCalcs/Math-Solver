import React, { useState, useEffect } from 'react';
import {
  Delete,
  Keyboard,
  ChevronDown,
  ChevronUp,
  PanelBottom,
  PanelBottomClose,
  RotateCcw,
} from 'lucide-react';

// Insert text at the cursor position of a controlled input
export const insertAtCursor = (ref, value, setValue, text) => {
  const el = ref?.current;
  if (!el) {
    setValue((value || '') + text);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  setValue(value.slice(0, start) + text + value.slice(end));
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  });
};

export const backspaceAtCursor = (ref, value, setValue) => {
  const el = ref?.current;
  if (!el) {
    setValue((value || '').slice(0, -1));
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  if (start === end && start > 0) {
    setValue(value.slice(0, start - 1) + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start - 1, start - 1);
    });
  } else if (start !== end) {
    setValue(value.slice(0, start) + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start);
    });
  }
};

const GROUPS = [
  {
    id: 'num_ops',
    label: '123 & Ops',
    shortLabel: '123',
    keys: [
      { d: '7', t: '7' }, { d: '8', t: '8' }, { d: '9', t: '9' }, { d: '+', t: '+' }, { d: '−', t: '-' },
      { d: '4', t: '4' }, { d: '5', t: '5' }, { d: '6', t: '6' }, { d: '×', t: '*' }, { d: '÷', t: '/' },
      { d: '1', t: '1' }, { d: '2', t: '2' }, { d: '3', t: '3' }, { d: '=', t: '=' }, { d: 'a/b', t: '/' },
      { d: '0', t: '0' }, { d: '.', t: '.' }, { d: '^', t: '^' }, { d: '(', t: '(' }, { d: ')', t: ')' },
    ],
  },
  {
    id: 'vars',
    label: 'Variables & Constants',
    shortLabel: 'x, y',
    keys: [
      { d: 'x', t: 'x' }, { d: 'y', t: 'y' }, { d: 'z', t: 'z' },
      { d: 'a', t: 'a' }, { d: 'b', t: 'b' }, { d: 'c', t: 'c' },
      { d: 'π', t: 'π' }, { d: 'e', t: 'e' }, { d: 'i', t: 'i' },
      { d: 'k', t: 'k' }, { d: 'n', t: 'n' }, { d: 't', t: 't' },
    ],
  },
  {
    id: 'powers',
    label: 'Powers & Roots',
    shortLabel: 'x² & √',
    keys: [
      { d: 'x²', t: '^2' }, { d: 'x³', t: '^3' }, { d: 'xⁿ', t: '^' },
      { d: '√', t: '√(' }, { d: 'ⁿ√', t: 'nthRoot(' }, { d: '|x|', t: '|' },
      { d: '1/x', t: '1/(' }, { d: '10ⁿ', t: '*10^' },
    ],
  },
  {
    id: 'functions',
    label: 'Functions',
    shortLabel: 'Func',
    keys: [
      { d: 'sin', t: 'sin(' }, { d: 'cos', t: 'cos(' }, { d: 'tan', t: 'tan(' },
      { d: 'log', t: 'log(' }, { d: 'ln', t: 'ln(' }, { d: '|x|', t: '|' },
      { d: 'asin', t: 'asin(' }, { d: 'acos', t: 'acos(' }, { d: 'atan', t: 'atan(' },
    ],
  },
  {
    id: 'grouping',
    label: 'Grouping & Comparison',
    shortLabel: '( )',
    keys: [
      { d: '(', t: '(' }, { d: ')', t: ')' }, { d: '[', t: '[' }, { d: ']', t: ']' },
      { d: ',', t: ',' }, { d: '<', t: '<' }, { d: '>', t: '>' }, { d: '≤', t: '<=' }, { d: '≥', t: '>=' },
    ],
  },
];

const QUICK_ROW_KEYS = [
  { d: 'x', t: 'x' },
  { d: 'y', t: 'y' },
  { d: '+', t: '+' },
  { d: '−', t: '-' },
  { d: '=', t: '=' },
  { d: 'x²', t: '^2' },
  { d: '√', t: '√(' },
  { d: '(', t: '(' },
  { d: ')', t: ')' },
];

export const SymbolKeyboard = ({
  onKey,
  onBackspace,
  onClear,
  customGroups,
  collapsible = true,
  defaultCollapsed = false,
}) => {
  // Mobile breakpoint detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  // Docked mode state (default to docked on mobile, inline on desktop, remember user preference)
  const [isDocked, setIsDocked] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('as_kb_docked');
      if (saved !== null) return saved === 'true';
      return window.innerWidth <= 768;
    }
    return false;
  });

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [activeCategory, setActiveCategory] = useState('num_ops');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDock = () => {
    const next = !isDocked;
    setIsDocked(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('as_kb_docked', String(next));
    }
  };

  const groupsToRender = customGroups || GROUPS;

  // Prevent blurring the active math input when tapping keys
  const handleKeyTouch = (e, val) => {
    e.preventDefault();
    onKey(val);
  };

  const handleBackspaceTouch = (e) => {
    e.preventDefault();
    onBackspace();
  };

  const handleClearTouch = (e) => {
    e.preventDefault();
    onClear();
  };

  // Content for the active category or all categories
  const displayedGroups =
    activeCategory === 'all'
      ? groupsToRender
      : groupsToRender.filter((g) => g.id === activeCategory);

  return (
    <>
      {/* FLOATING MOBILE DOCK TRIGGER PILL (When docked & collapsed on mobile or desktop) */}
      {isDocked && collapsed && (
        <button
          type="button"
          className="as-kb-floating-dock-trigger"
          data-testid="kb-floating-trigger"
          onClick={() => setCollapsed(false)}
          aria-label="Open Math Symbol Keyboard"
        >
          <Keyboard size={18} className="as-kb-trigger-icon" />
          <span className="as-kb-trigger-text">Math Keyboard</span>
          <ChevronUp size={16} />
        </button>
      )}

      {/* KEYBOARD WRAPPER */}
      <div
        className={`as-keyboard ${isDocked ? 'is-docked' : 'is-inline'} ${collapsed ? 'is-collapsed' : 'is-expanded'}`}
        data-testid="symbol-keyboard"
        role="toolbar"
        aria-label="Mathematical symbol keyboard"
      >
        {/* TOP / DOCK HEADER BAR */}
        <div className="as-kb-top-bar">
          <div className="as-kb-top-left">
            <Keyboard size={16} className="as-kb-header-icon" />
            <span className="as-kb-top-title">Math Symbol Keyboard</span>
            {isDocked && (
              <span className="as-kb-docked-indicator">
                Docked
              </span>
            )}
          </div>

          <div className="as-kb-top-actions">
            {/* Dock / Undock Toggle Button */}
            <button
              type="button"
              className="as-kb-dock-btn"
              data-testid="kb-dock-toggle"
              onClick={toggleDock}
              title={isDocked ? 'Undock (Place inline with page)' : 'Dock to bottom of screen'}
              aria-label={isDocked ? 'Undock keyboard' : 'Dock keyboard to bottom'}
            >
              {isDocked ? <PanelBottomClose size={15} /> : <PanelBottom size={15} />}
              <span className="as-kb-dock-btn-text">{isDocked ? 'Undock' : 'Dock'}</span>
            </button>

            {/* Collapse / Expand Toggle Button */}
            {collapsible && (
              <button
                type="button"
                className="as-kb-collapse-btn"
                data-testid="kb-collapse-btn"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
                title={collapsed ? 'Show keyboard' : 'Hide keyboard'}
              >
                {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                <span>{collapsed ? 'Show' : 'Hide'}</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDED KEYBOARD BODY */}
        {!collapsed && (
          <div className="as-kb-content-container">
            {/* QUICK-ACCESS PINNED ROW (Frequent keys for rapid single-tap entry) */}
            <div className="as-kb-quick-row" aria-label="Frequent symbols">
              {QUICK_ROW_KEYS.map((k) => (
                <button
                  type="button"
                  key={`quick-${k.d}`}
                  className="as-kb-quick-key"
                  data-testid={`kb-quick-key-${k.d}`}
                  onMouseDown={(e) => handleKeyTouch(e, k.t)}
                  onTouchStart={(e) => handleKeyTouch(e, k.t)}
                  title={`Insert ${k.d}`}
                >
                  {k.d}
                </button>
              ))}
            </div>

            {/* CATEGORY SWITCHER TABS (≥44px Touch Targets on Mobile) */}
            <div className="as-kb-category-tabs" role="tablist" aria-label="Keyboard symbol categories">
              {groupsToRender.map((g) => {
                const isActive = activeCategory === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`as-kb-cat-tab ${isActive ? 'active' : ''}`}
                    data-testid={`kb-tab-${g.id}`}
                    onClick={() => setActiveCategory(g.id)}
                  >
                    <span>{isMobile ? g.shortLabel || g.label : g.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'all'}
                className={`as-kb-cat-tab ${activeCategory === 'all' ? 'active' : ''}`}
                data-testid="kb-tab-all"
                onClick={() => setActiveCategory('all')}
              >
                <span>All</span>
              </button>
            </div>

            {/* KEY GRID AREA (Every key has >=44px touch targets on mobile/docked) */}
            <div className="as-kb-groups-view">
              {displayedGroups.map((g) => (
                <div className="as-kb-group" key={g.id || g.label}>
                  {activeCategory === 'all' && (
                    <div className="as-kb-label">{g.label}</div>
                  )}
                  <div className="as-kb-row">
                    {g.keys.map((k, i) => (
                      <button
                        type="button"
                        key={`${g.label}-${i}`}
                        className="as-kb-key"
                        data-testid={`kb-key-${k.d}`}
                        onMouseDown={(e) => handleKeyTouch(e, k.t)}
                        onTouchStart={(e) => handleKeyTouch(e, k.t)}
                        aria-label={`Key ${k.d}`}
                      >
                        {k.d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ACTION CONTROLS (Backspace, Clear, Dismiss with >=44px touch targets) */}
            <div className="as-kb-actions">
              <button
                type="button"
                className="as-kb-action as-kb-action-backspace"
                data-testid="kb-backspace"
                onMouseDown={handleBackspaceTouch}
                onTouchStart={handleBackspaceTouch}
                aria-label="Backspace delete last symbol"
              >
                <Delete size={17} />
                <span>Backspace</span>
              </button>

              <button
                type="button"
                className="as-kb-action as-kb-clear"
                data-testid="kb-clear"
                onMouseDown={handleClearTouch}
                onTouchStart={handleClearTouch}
                aria-label="Clear entire input"
              >
                <RotateCcw size={15} />
                <span>Clear</span>
              </button>

              {isDocked && (
                <button
                  type="button"
                  className="as-kb-action as-kb-action-hide"
                  data-testid="kb-docked-hide"
                  onClick={() => setCollapsed(true)}
                  aria-label="Minimize docked keyboard"
                >
                  <ChevronDown size={17} />
                  <span>Minimize</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DOCKED BOTTOM PADDING SPACER (Prevents page content from being hidden behind fixed docked keyboard) */}
      {isDocked && !collapsed && (
        <div className="as-kb-docked-spacer" aria-hidden="true" />
      )}
    </>
  );
};

