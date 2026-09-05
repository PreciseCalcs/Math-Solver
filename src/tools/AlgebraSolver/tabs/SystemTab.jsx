import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Minus, Grid3x3, Split, ArrowRightLeft, Layers, Sparkles, Orbit } from 'lucide-react';
import { SymbolKeyboard, insertAtCursor, backspaceAtCursor } from '../components/SymbolKeyboard';
import { StepsView } from '../components/StepsView';
import { LiveMathPreview } from '../components/LiveMathPreview';
import { solveSystem } from '../engine/system';
import { toLiveMathTex } from '../engine/liveMath.js';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';

const SYSTEM_METHODS = [
  {
    id: 'gauss-jordan',
    label: 'Gauss-Jordan',
    icon: Layers,
    desc: 'Row-reduce the augmented matrix [A | B] into Reduced Row Echelon Form (RREF)',
  },
  {
    id: 'cramer',
    label: 'Cramer’s Rule',
    icon: Split,
    desc: 'Solve via determinants: xᵢ = det(Aᵢ) / det(A) with explicit expansions',
  },
  {
    id: 'substitution',
    label: 'Substitution',
    icon: ArrowRightLeft,
    desc: 'Isolate one variable, substitute into other equations, and back-substitute',
  },
  {
    id: 'matrix-inversion',
    label: 'Matrix Inversion',
    icon: Grid3x3,
    desc: 'Express in matrix form AX = B and compute solution directly via X = A⁻¹ · B',
  },
];

const EXAMPLES = [
  { label: '2×2 Linear', vars: 'x, y', eqs: ['2x + 3y = 13', 'x - y = 1'], method: 'gauss-jordan' },
  { label: '3×3 Linear', vars: 'x, y, z', eqs: ['x + y + z = 6', '2x - y + z = 3', 'x + 2y - z = 2'], method: 'cramer' },
  { label: 'Cramer 2×2', vars: 'x, y', eqs: ['3x + 4y = 10', '2x - y = 3'], method: 'cramer' },
  { label: 'Circle & Line (Non-Linear)', vars: 'x, y', eqs: ['x^2 + y^2 = 25', 'x - y = 1'], method: 'substitution' },
  { label: 'Parabola & Line (Non-Linear)', vars: 'x, y', eqs: ['y = x^2 - 4', 'y = 2x - 1'], method: 'substitution' },
  { label: 'Conics (Non-Linear)', vars: 'x, y', eqs: ['x^2 + y^2 = 25', 'x^2 - y^2 = 7'], method: 'substitution' },
  { label: 'Hyperbola & Line', vars: 'x, y', eqs: ['x*y = 6', 'x + y = 5'], method: 'substitution' },
];

export const SystemTab = ({ decimal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialVars = searchParams.get('vars') || 'x, y';
  const initialEqs = searchParams.get('eqs')
    ? searchParams.get('eqs').split(';').map((s) => s.trim()).filter(Boolean)
    : ['2x + 3y = 13', 'x - y = 1'];
  const initialMethod = searchParams.get('method') || 'gauss-jordan';

  const [vars, setVars] = useState(initialVars);
  const [eqs, setEqs] = useState(initialEqs);
  const [method, setMethod] = useState(initialMethod);
  const [result, setResult] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [autoSolve, setAutoSolve] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const refs = useRef([]);
  const timerRef = useRef(null);

  const { addSolvedProblem, recalledProblem } = useMathHistory();

  // Detect whether current equations are non-linear
  const isNonLinear = useMemo(() => {
    const combined = eqs.join(' ');
    return (
      /\^|²|³|\*y|\*x|sqrt|abs|xy|yx/.test(combined) ||
      /[a-zA-Z]\s*\*\s*[a-zA-Z]/.test(combined)
    );
  }, [eqs]);

  const setEq = (i, val) => setEqs((prev) => prev.map((e, j) => (j === i ? val : e)));

  const solve = (customVars = vars, customEqs = eqs, customMethod = method) => {
    setIsSolving(true);
    try {
      const res = solveSystem(customVars, customEqs, { method: customMethod, decimal });
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
      const nextMethod = recalledProblem.payload.method || 'gauss-jordan';
      setVars(nextVars);
      setEqs(nextEqs);
      setMethod(nextMethod);
      solve(nextVars, nextEqs, nextMethod);
    }
  }, [recalledProblem]);

  // Save successful solve to history
  useEffect(() => {
    if (result && !result.error && eqs.some((e) => e.trim().length > 0)) {
      const ans = cleanPlainMath(result.answerTex || '');
      const methodObj = SYSTEM_METHODS.find((m) => m.id === method);
      const title = isNonLinear
        ? `Non-Linear System (${vars})`
        : `Linear System — ${methodObj ? methodObj.label : 'System'} (${vars})`;

      addSolvedProblem({
        tab: 'system',
        title,
        expression: eqs.filter(Boolean).join(' ; '),
        tex: `\\begin{cases} ${eqs.filter(Boolean).map((e) => toLiveMathTex(e).tex || e).join(' \\\\ ')} \\end{cases}`,
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { vars, eqs, method },
      });
    }
  }, [result, vars, eqs, method, isNonLinear, addSolvedProblem]);

  useEffect(() => {
    if (searchParams.get('eqs') || searchParams.get('vars')) {
      solve(initialVars, initialEqs, initialMethod);
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
      solve(vars, eqs, method);
    }, 450);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [vars, eqs, method, decimal, autoSolve]);

  // System LaTeX representation
  const systemTex = `\\begin{cases} ${eqs.map((e) => toLiveMathTex(e).tex || '\\dots').join(' \\\\ ')} \\end{cases}`;
  const currentMethodObj = SYSTEM_METHODS.find((m) => m.id === method) || SYSTEM_METHODS[0];

  return (
    <div className="as-panel" data-testid="system-tab">
      <h2 className="as-panel-title">System of Equations Solver</h2>

      {/* Method Selector Tabs */}
      <div className="as-method-selector-container">
        <label className="as-field-label">Solving Method</label>
        <div className="as-method-bar" data-testid="system-method-bar">
          {SYSTEM_METHODS.map((m) => {
            const Icon = m.icon;
            const isSelected = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`as-method-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setMethod(m.id);
                  solve(vars, eqs, m.id);
                }}
                data-testid={`method-btn-${m.id}`}
              >
                <Icon size={14} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Non-linear or method callout */}
      {isNonLinear ? (
        <div className="as-method-desc-callout non-linear" data-testid="nonlinear-notice">
          <Orbit size={14} className="text-amber-600" />
          <span>
            <strong>Non-Linear System Detected:</strong> Quadratic, conic, or product terms present. Automatically solved with step-by-step algebraic substitution, standard polynomial form reduction, and extraneous root verification.
          </span>
        </div>
      ) : (
        <div className="as-method-desc-callout" data-testid="method-desc-callout">
          <Sparkles size={13} className="text-indigo-600" />
          <span>
            <strong>{currentMethodObj.label}:</strong> {currentMethodObj.desc}
          </span>
        </div>
      )}

      <label className="as-field-label" htmlFor="system-vars">
        Variables (comma separated)
      </label>
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
            placeholder={`Equation ${i + 1} (e.g. 2x + 3y = 13 or x^2 + y^2 = 25)`}
            autoComplete="off"
            spellCheck={false}
          />
          {eqs.length > 1 && (
            <button
              type="button"
              className="as-icon-btn"
              data-testid={`system-remove-eq-${i}`}
              aria-label="Remove equation"
              onClick={() => setEqs((prev) => prev.filter((_, j) => j !== i))}
            >
              <Minus size={16} />
            </button>
          )}
        </div>
      ))}

      {eqs.length < 6 && (
        <button
          type="button"
          className="as-add-btn"
          data-testid="system-add-eq-btn"
          onClick={() => setEqs((prev) => [...prev, ''])}
        >
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
        <span className="as-examples-label">Examples:</span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="as-example-chip"
            data-testid={`system-example-${i}`}
            onClick={() => {
              setVars(ex.vars);
              setEqs(ex.eqs);
              if (ex.method) setMethod(ex.method);
              solve(ex.vars, ex.eqs, ex.method || method);
            }}
          >
            <strong>{ex.label}:</strong> {ex.eqs.join(' ; ')}
          </button>
        ))}
      </div>

      <SymbolKeyboard
        onKey={(t) =>
          insertAtCursor(
            { current: refs.current[focusIdx] },
            eqs[focusIdx] ?? '',
            (val) => setEq(focusIdx, val),
            t
          )
        }
        onBackspace={() =>
          backspaceAtCursor(
            { current: refs.current[focusIdx] },
            eqs[focusIdx] ?? '',
            (val) => setEq(focusIdx, val)
          )
        }
        onClear={() => {
          setEqs(eqs.map(() => ''));
          setResult(null);
        }}
      />

      <button
        type="button"
        className="as-solve-btn"
        data-testid="system-solve-btn"
        onClick={() => solve()}
      >
        {isSolving ? 'Solving...' : `Solve system (${currentMethodObj.label})`}
      </button>

      <StepsView
        result={result}
        problemTitle={
          isNonLinear
            ? `Non-Linear System in (${vars})`
            : `Linear System in (${vars}) — ${currentMethodObj.label}`
        }
        problemTex={`\\begin{cases} ${eqs.filter(Boolean).map((e) => toLiveMathTex(e).tex || e).join(' \\\\ ')} \\end{cases}`}
        shareParams={{
          tab: 'system',
          vars,
          eqs: eqs.join(';'),
          method,
          dec: decimal ? '1' : '0',
        }}
        decimal={decimal}
      />
    </div>
  );
};
