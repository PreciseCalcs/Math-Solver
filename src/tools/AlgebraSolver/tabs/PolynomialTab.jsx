import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Divide, Split, Grid2x2, Sparkles, Layers } from 'lucide-react';
import { SymbolKeyboard, insertAtCursor, backspaceAtCursor } from '../components/SymbolKeyboard';
import { StepsView } from '../components/StepsView';
import { LiveMathPreview } from '../components/LiveMathPreview';
import { MathBlock } from '../components/MathBlock';
import {
  solvePolyLongDivision,
  solveSyntheticDivision,
  solvePolyMultiplication,
} from '../engine/polyOps';
import { toLiveMathTex } from '../engine/liveMath.js';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';

const POLY_MODES = [
  {
    id: 'division',
    label: 'Long Division',
    icon: Divide,
    desc: 'Polynomial division P(x) ÷ D(x) with quotient, remainder, and full steps',
    examples: [
      { p: '2x^3 - 3x^2 + 4x - 5', d: 'x - 2' },
      { p: 'x^4 + 3x^2 - 2', d: 'x^2 + 1' },
      { p: '3x^3 + 5x^2 - 11x + 4', d: 'x + 3' },
    ],
  },
  {
    id: 'synthetic',
    label: 'Synthetic Division',
    icon: Split,
    desc: 'Rapid division for linear divisors (x - c) with the classic synthetic tableau',
    examples: [
      { p: '2x^3 - 3x^2 + 4x - 5', d: 'x - 2' },
      { p: 'x^3 - 6x^2 + 11x - 6', d: 'x - 1' },
      { p: '3x^4 - 2x^2 + 5', d: 'x + 2' },
    ],
  },
  {
    id: 'multiplication',
    label: 'Multiplication / FOIL',
    icon: Grid2x2,
    desc: 'Expand products of polynomials using distributive property and combining like terms',
    examples: [
      { p: '2x + 3', d: 'x^2 - 4x + 5' },
      { p: 'x^2 - 2x + 1', d: 'x + 4' },
      { p: '3x - 2', d: '2x + 5' },
    ],
  },
];

export const PolynomialTab = ({ decimal }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState(searchParams.get('pmode') || 'division');
  const [variable, setVariable] = useState(searchParams.get('pvar') || 'x');
  const [poly1, setPoly1] = useState(searchParams.get('p1') || '2x^3 - 3x^2 + 4x - 5');
  const [poly2, setPoly2] = useState(searchParams.get('p2') || 'x - 2');
  const [result, setResult] = useState(null);
  const [focusField, setFocusField] = useState('poly1');
  const [autoSolve, setAutoSolve] = useState(true);
  const [isSolving, setIsSolving] = useState(false);

  const poly1Ref = useRef(null);
  const poly2Ref = useRef(null);
  const timerRef = useRef(null);

  const { addSolvedProblem, recalledProblem } = useMathHistory();

  const solve = (customP1 = poly1, customP2 = poly2, customMode = mode, customVar = variable) => {
    setIsSolving(true);
    try {
      let res;
      if (customMode === 'synthetic') {
        res = solveSyntheticDivision(customP1, customP2, { variable: customVar, decimal });
      } else if (customMode === 'multiplication') {
        res = solvePolyMultiplication(customP1, customP2, { variable: customVar, decimal });
      } else {
        res = solvePolyLongDivision(customP1, customP2, { variable: customVar, decimal });
      }
      setResult(res);
    } catch (err) {
      setResult({ error: err.message || 'Error executing polynomial operation' });
    } finally {
      setIsSolving(false);
    }
  };

  // Recalled problem from history
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'polynomial' && recalledProblem.payload) {
      const p = recalledProblem.payload;
      setMode(p.mode || 'division');
      setVariable(p.variable || 'x');
      setPoly1(p.poly1 || '');
      setPoly2(p.poly2 || '');
      solve(p.poly1, p.poly2, p.mode, p.variable);
    }
  }, [recalledProblem]);

  // Save to history on successful solve
  useEffect(() => {
    if (result && !result.error && poly1.trim() && poly2.trim()) {
      const modeObj = POLY_MODES.find((m) => m.id === mode);
      const title = `${modeObj ? modeObj.label : 'Polynomial'} (${variable})`;
      const ans = cleanPlainMath(result.answerTex || '');
      addSolvedProblem({
        tab: 'polynomial',
        title,
        expression: `${poly1} ${mode === 'multiplication' ? '×' : '÷'} ${poly2}`,
        tex: result.answerTex || '',
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { mode, variable, poly1, poly2 },
      });
    }
  }, [result, mode, variable, poly1, poly2, addSolvedProblem]);

  // Debounced auto-solve
  useEffect(() => {
    if (!autoSolve) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!poly1.trim() || !poly2.trim()) {
      setResult(null);
      setIsSolving(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      solve(poly1, poly2, mode, variable);
    }, 450);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poly1, poly2, mode, variable, decimal, autoSolve]);

  const currentModeObj = POLY_MODES.find((m) => m.id === mode) || POLY_MODES[0];

  // Construct Live LaTeX Preview
  let liveTex = '';
  const p1Tex = toLiveMathTex(poly1).tex || poly1;
  const p2Tex = toLiveMathTex(poly2).tex || poly2;

  if (mode === 'multiplication') {
    liveTex = `\\left(${p1Tex}\\right) \\cdot \\left(${p2Tex}\\right)`;
  } else {
    liveTex = `\\frac{${p1Tex}}{${p2Tex}}`;
  }

  const activeInputRef = focusField === 'poly1' ? poly1Ref : poly2Ref;
  const activeVal = focusField === 'poly1' ? poly1 : poly2;
  const setActiveVal = focusField === 'poly1' ? setPoly1 : setPoly2;

  return (
    <div className="as-panel" data-testid="polynomial-tab">
      <h2 className="as-panel-title">Polynomial Operations &amp; Division</h2>

      {/* Mode Selector Tabs */}
      <div className="as-method-bar" data-testid="polynomial-mode-bar">
        {POLY_MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              className={`as-method-btn ${mode === m.id ? 'active' : ''}`}
              onClick={() => {
                setMode(m.id);
                solve(poly1, poly2, m.id, variable);
              }}
              data-testid={`poly-mode-${m.id}`}
            >
              <Icon size={14} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="as-method-desc-callout">
        <Sparkles size={13} className="text-amber-600" />
        <span>{currentModeObj.desc}</span>
      </div>

      <div className="as-poly-inputs-grid">
        <div className="as-poly-field">
          <label className="as-field-label" htmlFor="poly1-input">
            {mode === 'multiplication' ? 'First Polynomial P(x)' : 'Dividend P(x)'}
          </label>
          <input
            id="poly1-input"
            ref={poly1Ref}
            className="as-input"
            data-testid="poly1-input"
            value={poly1}
            onChange={(e) => setPoly1(e.target.value)}
            onFocus={() => setFocusField('poly1')}
            placeholder="e.g. 2x^3 - 3x^2 + 4x - 5"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="as-poly-field">
          <label className="as-field-label" htmlFor="poly2-input">
            {mode === 'multiplication'
              ? 'Second Polynomial Q(x)'
              : mode === 'synthetic'
              ? 'Linear Divisor D(x) (e.g. x - 2)'
              : 'Divisor D(x)'}
          </label>
          <input
            id="poly2-input"
            ref={poly2Ref}
            className="as-input"
            data-testid="poly2-input"
            value={poly2}
            onChange={(e) => setPoly2(e.target.value)}
            onFocus={() => setFocusField('poly2')}
            placeholder={mode === 'synthetic' ? 'e.g. x - 2' : 'e.g. x - 2 or x^2 + 1'}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Variable selector */}
      <div className="as-poly-var-row">
        <label className="as-field-label" htmlFor="poly-var-input">Variable:</label>
        <input
          id="poly-var-input"
          className="as-input as-input-compact"
          data-testid="poly-var-input"
          value={variable}
          onChange={(e) => setVariable(e.target.value.trim() || 'x')}
          maxLength={3}
          style={{ width: '60px', textAlign: 'center' }}
        />
      </div>

      {/* Live Preview */}
      <LiveMathPreview
        customTex={liveTex}
        label="Expression Preview"
        placeholderTex="\frac{2x^3 - 3x^2 + 4x - 5}{x - 2}"
        isSolving={isSolving}
        autoSolve={autoSolve}
        onToggleAutoSolve={() => setAutoSolve((prev) => !prev)}
      />

      {/* Example chips */}
      <div className="as-examples">
        <span className="as-examples-label">Examples:</span>
        {currentModeObj.examples.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="as-example-chip"
            data-testid={`poly-example-${i}`}
            onClick={() => {
              setPoly1(ex.p);
              setPoly2(ex.d);
              solve(ex.p, ex.d, mode, variable);
            }}
          >
            {mode === 'multiplication' ? (
              <MathBlock
                tex={`(${toLiveMathTex(ex.p).tex || ex.p})(${toLiveMathTex(ex.d).tex || ex.d})`}
                inline={true}
              />
            ) : (
              <MathBlock
                tex={`(${toLiveMathTex(ex.p).tex || ex.p}) \\div (${toLiveMathTex(ex.d).tex || ex.d})`}
                inline={true}
              />
            )}
          </button>
        ))}
      </div>

      <SymbolKeyboard
        onKey={(t) => insertAtCursor(activeInputRef, activeVal, setActiveVal, t)}
        onBackspace={() => backspaceAtCursor(activeInputRef, activeVal, setActiveVal)}
        onClear={() => {
          setPoly1('');
          setPoly2('');
          setResult(null);
        }}
      />

      <button
        type="button"
        className="as-solve-btn"
        data-testid="poly-solve-btn"
        onClick={() => solve()}
      >
        {isSolving ? 'Computing...' : mode === 'multiplication' ? 'Multiply polynomials' : 'Divide polynomial'}
      </button>

      <StepsView
        result={result}
        problemTitle={`${currentModeObj.label}: ${poly1} ${mode === 'multiplication' ? '·' : '÷'} ${poly2}`}
        problemTex={liveTex}
        shareParams={{
          tab: 'polynomial',
          pmode: mode,
          p1: poly1,
          p2: poly2,
          pvar: variable,
          dec: decimal ? '1' : '0',
        }}
        decimal={decimal}
      />
    </div>
  );
};
