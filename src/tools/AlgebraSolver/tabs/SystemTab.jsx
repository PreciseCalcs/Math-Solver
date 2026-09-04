import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';
import { SymbolKeyboard, insertAtCursor, backspaceAtCursor } from '../components/SymbolKeyboard';
import { StepsView } from '../components/StepsView';
import { LiveMathPreview } from '../components/LiveMathPreview';
import { solveSystem } from '../engine/system';
import { toLiveMathTex } from '../engine/liveMath.js';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';

const EXAMPLES = [
  { vars: 'x, y', eqs: ['2x + 3y = 13', 'x - y = 1'] },
  { vars: 'x, y, z', eqs: ['x + y + z = 6', '2x - y + z = 3', 'x + 2y - z = 2'] },
];

export const SystemTab = ({ decimal }) => {
  const [searchParams] = useSearchParams();
  const initialVars = searchParams.get('vars') || 'x, y';
  const initialEqs = searchParams.get('eqs')
    ? searchParams.get('eqs').split(';').map((s) => s.trim()).filter(Boolean)
    : ['2x + 3y = 13', 'x - y = 1'];

  const [vars, setVars] = useState(initialVars);
  const [eqs, setEqs] = useState(initialEqs);
  const [result, setResult] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [autoSolve, setAutoSolve] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const refs = useRef([]);
  const timerRef = useRef(null);

  const { addSolvedProblem, recalledProblem } = useMathHistory();

  const setEq = (i, val) => setEqs((prev) => prev.map((e, j) => (j === i ? val : e)));

  const solve = (customVars = vars, customEqs = eqs) => {
    setIsSolving(true);
    try {
      const res = solveSystem(customVars, customEqs, { decimal });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message || 'Error solving system' });
    } finally {
      setIsSolving(false);
    }
  };

  // Listen for recalled problem from history
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'system' && recalledProblem.payload) {
      const nextVars = recalledProblem.payload.vars || 'x, y';
      const nextEqs = recalledProblem.payload.eqs || ['2x + 3y = 13', 'x - y = 1'];
      setVars(nextVars);
      setEqs(nextEqs);
      solve(nextVars, nextEqs);
    }
  }, [recalledProblem]);

  // Save successful solve to history
  useEffect(() => {
    if (result && !result.error && eqs.some((e) => e.trim().length > 0)) {
      const ans = cleanPlainMath(result.answerTex || '');
      addSolvedProblem({
        tab: 'system',
        title: `Linear System (${vars})`,
        expression: eqs.filter(Boolean).join(' ; '),
        tex: `\\begin{cases} ${eqs.filter(Boolean).map((e) => toLiveMathTex(e)).join(' \\\\ ')} \\end{cases}`,
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { vars, eqs },
      });
    }
  }, [result, vars, eqs, addSolvedProblem]);

  useEffect(() => {
    if (searchParams.get('eqs') || searchParams.get('vars')) {
      solve(initialVars, initialEqs);
    }
  }, []);

  // Debounced auto-solve for the system
  useEffect(() => {
    if (!autoSolve) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const hasContent = eqs.some((e) => e.trim().length > 0) && vars.trim().length > 0;
    if (!hasContent) {
      setResult(null);
      setIsSolving(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      setIsSolving(true);
      try {
        const res = solveSystem(vars, eqs, { decimal });
        if (res && !res.error) {
          setResult(res);
        }
      } catch {
        // Suppress errors during typing
      } finally {
        setIsSolving(false);
      }
    }, 450);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [vars, eqs, decimal, autoSolve]);

  // System LaTeX representation
  const systemTex = `\\begin{cases} ${eqs.map((e) => toLiveMathTex(e).tex || '\\dots').join(' \\\\ ')} \\end{cases}`;

  return (
    <div className="as-panel" data-testid="system-tab">
      <h2 className="as-panel-title">Linear system (up to 6 variables)</h2>
      <label className="as-field-label" htmlFor="system-vars">Variables (comma separated)</label>
      <input
        id="system-vars"
        className="as-input"
        data-testid="system-vars-input"
        value={vars}
        onChange={(e) => setVars(e.target.value)}
        placeholder="x, y"
        autoComplete="off"
        spellCheck={false}
      />
      <label className="as-field-label">Equations</label>
      {eqs.map((eq, i) => (
        <div className="as-eq-row" key={i}>
          <input
            ref={(el) => { refs.current[i] = el; }}
            className="as-input"
            data-testid={`system-eq-input-${i}`}
            value={eq}
            onChange={(e) => setEq(i, e.target.value)}
            onFocus={() => setFocusIdx(i)}
            onKeyDown={(e) => e.key === 'Enter' && solve()}
            placeholder={`Equation ${i + 1}`}
            autoComplete="off"
            spellCheck={false}
          />
          {eqs.length > 1 && (
            <button type="button" className="as-icon-btn" data-testid={`system-remove-eq-${i}`} aria-label="Remove equation" onClick={() => setEqs((prev) => prev.filter((_, j) => j !== i))}>
              <Minus size={16} />
            </button>
          )}
        </div>
      ))}
      {eqs.length < 6 && (
        <button type="button" className="as-add-btn" data-testid="system-add-eq-btn" onClick={() => setEqs((prev) => [...prev, ''])}>
          <Plus size={14} /> Add equation
        </button>
      )}

      {/* Live Math System Preview */}
      <LiveMathPreview
        customTex={systemTex}
        label="Live System Preview"
        placeholderTex="\begin{cases} 2x + 3y = 13 \\ x - y = 1 \end{cases}"
        isSolving={isSolving}
        autoSolve={autoSolve}
        onToggleAutoSolve={() => setAutoSolve((prev) => !prev)}
      />

      <div className="as-examples">
        <span className="as-examples-label">Try:</span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="as-example-chip"
            data-testid={`system-example-${i}`}
            onClick={() => {
              setVars(ex.vars);
              setEqs(ex.eqs);
              solve(ex.vars, ex.eqs);
            }}
          >
            {ex.eqs.join(' ; ')}
          </button>
        ))}
      </div>
      <SymbolKeyboard
        onKey={(t) => insertAtCursor({ current: refs.current[focusIdx] }, eqs[focusIdx] ?? '', (val) => setEq(focusIdx, val), t)}
        onBackspace={() => backspaceAtCursor({ current: refs.current[focusIdx] }, eqs[focusIdx] ?? '', (val) => setEq(focusIdx, val))}
        onClear={() => { setEqs(eqs.map(() => '')); setResult(null); }}
      />
      <button type="button" className="as-solve-btn" data-testid="system-solve-btn" onClick={() => solve()}>
        {isSolving ? 'Solving...' : 'Solve system'}
      </button>
      <StepsView
        result={result}
        problemTitle={`Linear System in (${vars})`}
        problemTex={`\\begin{cases} ${eqs.filter(Boolean).map((e) => toLiveMathTex(e)).join(' \\\\ ')} \\end{cases}`}
        shareParams={{
          tab: 'system',
          vars,
          eqs: eqs.join(';'),
          dec: decimal ? '1' : '0',
        }}
        decimal={decimal}
      />
    </div>
  );
};
