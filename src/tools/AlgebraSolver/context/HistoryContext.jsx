import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  loadMathHistory,
  addSolvedProblemToHistory,
  removeHistoryItemById,
  clearMathHistory,
  MAX_HISTORY_ITEMS,
} from '../utils/historyStorage';

const HistoryContext = createContext(null);

export function HistoryProvider({ children, currentTab, onTabChange }) {
  const [history, setHistory] = useState(() => loadMathHistory());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recalledProblem, setRecalledProblem] = useState(null);

  // Debounce ref to prevent saving keystroke fragments during rapid typing
  const debounceTimerRef = useRef(null);

  // Re-read storage on mount in case changed in another tab/window
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'as_math_history_v1') {
        setHistory(loadMathHistory());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  /**
   * Adds a solved problem into history.
   * If immediate is false (e.g. from reactive auto-solve), debounces briefly to ensure user finished typing.
   */
  const addSolvedProblem = useCallback((problemData, { immediate = false } = {}) => {
    if (!problemData || !problemData.tab) return;

    const commit = () => {
      setHistory((prev) => addSolvedProblemToHistory(prev, problemData));
    };

    if (immediate) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      commit();
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(commit, 800);
    }
  }, []);

  /**
   * Recalls a past math problem and commands the solver to restore and solve it.
   */
  const recallProblem = useCallback(
    (item) => {
      if (!item) return;

      if (item.tab && item.tab !== currentTab && typeof onTabChange === 'function') {
        onTabChange(item.tab);
      }

      // Provide unique nonce so tabs react even if recalling same item twice
      setRecalledProblem({
        ...item,
        recallNonce: Date.now(),
      });

      // Close history drawer after recall on mobile or keep open if desktop,
      // but closing provides great immediate feedback so the user sees their restored equation & solution!
      setIsHistoryOpen(false);
    },
    [currentTab, onTabChange]
  );

  const removeProblem = useCallback((id) => {
    setHistory((prev) => removeHistoryItemById(prev, id));
  }, []);

  const handleClearAll = useCallback(() => {
    clearMathHistory();
    setHistory([]);
  }, []);

  const value = {
    history,
    maxCapacity: MAX_HISTORY_ITEMS,
    isHistoryOpen,
    setIsHistoryOpen,
    recalledProblem,
    addSolvedProblem,
    recallProblem,
    removeProblem,
    clearHistory: handleClearAll,
  };

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useMathHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useMathHistory must be used within a HistoryProvider');
  }
  return context;
}
