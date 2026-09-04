/**
 * LocalStorage management for the last 10 math problems solved in AlgebraSolver.
 */

const STORAGE_KEY = 'as_math_history_v1';
export const MAX_HISTORY_ITEMS = 10;

/**
 * Loads the saved history items from localStorage.
 * Guaranteed to return an array of at most MAX_HISTORY_ITEMS.
 */
export function loadMathHistory() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY_ITEMS);
  } catch (err) {
    console.warn('Unable to load math history from localStorage:', err);
    return [];
  }
}

/**
 * Persists the history items array to localStorage.
 */
export function saveMathHistory(items) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return items;
  }
  try {
    const bounded = (items || []).slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
    return bounded;
  } catch (err) {
    console.warn('Unable to save math history to localStorage:', err);
    return items;
  }
}

/**
 * Clears all math history from localStorage.
 */
export function clearMathHistory() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Unable to clear math history:', err);
    }
  }
  return [];
}

/**
 * Helper to generate a friendly title if none provided
 */
function defaultTitle(tab, expr) {
  switch (tab) {
    case 'equation':
      return expr ? `Equation: ${expr}` : 'Equation';
    case 'system':
      return 'Linear System';
    case 'matrix':
      return 'Matrix Operation';
    case 'series':
      return 'Series / Sequence';
    case 'complex':
      return expr ? `Complex: ${expr}` : 'Complex Arithmetic';
    default:
      return 'Math Problem';
  }
}

/**
 * Normalize an expression string for comparing duplicates
 */
function normalizeExpr(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Checks if two problem items represent the same mathematical problem.
 */
function isDuplicateProblem(a, b) {
  if (!a || !b) return false;
  if (a.tab !== b.tab) return false;

  const exprA = normalizeExpr(a.expression || a.payload?.value || a.payload?.expr);
  const exprB = normalizeExpr(b.expression || b.payload?.value || b.payload?.expr);

  if (exprA && exprB && exprA === exprB) return true;

  if (a.tab === 'system' && a.payload?.eqs && b.payload?.eqs) {
    const aEqs = (a.payload.eqs || []).map(normalizeExpr).join(';');
    const bEqs = (b.payload.eqs || []).map(normalizeExpr).join(';');
    return aEqs === bEqs;
  }

  if (a.tab === 'matrix' && a.payload?.op === b.payload?.op && a.payload?.cells && b.payload?.cells) {
    return JSON.stringify(a.payload.cells) === JSON.stringify(b.payload.cells);
  }

  if (a.tab === 'series' && a.payload?.mode === b.payload?.mode) {
    return JSON.stringify(a.payload) === JSON.stringify(b.payload);
  }

  return false;
}

/**
 * Adds a solved problem to the history, maintaining MRU order and max capacity of 10.
 * If the problem was already in history, it is moved to the top and updated.
 */
export function addSolvedProblemToHistory(existingHistory = [], problemData) {
  if (!problemData || !problemData.tab) return existingHistory;

  const expression = String(problemData.expression || '').trim();
  if (!expression && !problemData.payload) return existingHistory;

  const newItem = {
    id: problemData.id || `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tab: problemData.tab,
    title: problemData.title || defaultTitle(problemData.tab, expression),
    expression: expression,
    tex: problemData.tex || '',
    answer: problemData.answer || '',
    answerTex: problemData.answerTex || '',
    timestamp: Date.now(),
    payload: problemData.payload || {},
  };

  // Filter out any existing item that matches this problem (MRU move to front)
  const filtered = existingHistory.filter((item) => !isDuplicateProblem(item, newItem));

  // Prepend and cap at MAX_HISTORY_ITEMS (10)
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

  saveMathHistory(updated);
  return updated;
}

/**
 * Removes a single item by ID from history.
 */
export function removeHistoryItemById(existingHistory = [], id) {
  const updated = existingHistory.filter((item) => item.id !== id);
  saveMathHistory(updated);
  return updated;
}

/**
 * Human readable relative timestamp ("Just now", "2m ago", "1h ago", "Yesterday")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
