import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Universal hook for real-time debounced math solving.
 * Reusable across Algebra, Calculus, Trigonometry, Matrix, and Physics calculators.
 * 
 * @param {Object} options
 * @param {string} options.value - Current mathematical input string
 * @param {Function} options.solveFn - Pure synchronous or async solving function
 * @param {number} [options.delay=380] - Debounce delay in milliseconds
 * @param {boolean} [options.autoSolve=true] - Whether live debounced evaluation is active
 * @param {Array} [options.dependencies=[]] - Additional dependencies (e.g. decimal mode, angle mode)
 */
export function useDebouncedSolve({
  value,
  solveFn,
  delay = 380,
  autoSolve = true,
  dependencies = [],
}) {
  const [result, setResult] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const timerRef = useRef(null);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const solveFnRef = useRef(solveFn);
  solveFnRef.current = solveFn;

  // Immediate forced solve (for manual 'Solve' button click or Enter key)
  const forceSolve = useCallback(
    (inputToSolve = latestValueRef.current) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const str = (inputToSolve ?? '').trim();
      if (!str) {
        setResult(null);
        setIsSolving(false);
        return;
      }
      setIsSolving(true);
      try {
        const res = solveFnRef.current(str);
        setResult(res);
      } catch (err) {
        setResult({ error: err.message || 'Error evaluating expression' });
      } finally {
        setIsSolving(false);
      }
    },
    []
  );

  // Reactive debounced solve
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      setResult(null);
      setIsSolving(false);
      return;
    }

    if (!autoSolve) {
      setIsSolving(false);
      return;
    }

    // Schedule debounced solving without premature state toggling
    timerRef.current = setTimeout(() => {
      setIsSolving(true);
      try {
        const res = solveFnRef.current(trimmed);
        if (res && !res.error) {
          setResult(res);
        }
      } catch {
        // Suppress intermediate parse exceptions while user is actively typing
      } finally {
        setIsSolving(false);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, autoSolve, delay, ...dependencies]);

  return {
    result,
    setResult,
    isSolving,
    forceSolve,
  };
}
