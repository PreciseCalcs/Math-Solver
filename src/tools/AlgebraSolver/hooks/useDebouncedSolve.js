import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to handle real-time debounced solving of math expressions.
 * - Updates results smoothly when expressions parse and solve successfully.
 * - Suppresses premature error banners while the user is actively typing.
 * - Exposes forceSolve for Enter key and button clicks to show full feedback.
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

  // Immediate forced solve (e.g. button click or Enter key)
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

  // Debounced reactive solving
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

    timerRef.current = setTimeout(() => {
      setIsSolving(true);
      try {
        const res = solveFnRef.current(trimmed);
        if (res && !res.error) {
          setResult(res);
        }
      } catch {
        // Suppress during typing
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
