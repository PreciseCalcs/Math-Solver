import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, RotateCcw } from 'lucide-react';
import { SymbolKeyboard, insertAtCursor, backspaceAtCursor } from '../components/SymbolKeyboard';
import { StepsView } from '../components/StepsView';
import { UnifiedMathCard } from '../components/UnifiedMathCard';
import { solveEquation } from '../engine/equation.js';
import { useDebouncedSolve } from '../hooks/useDebouncedSolve';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';
import { MathBlock } from '../components/MathBlock';
import { toLiveMathTex } from '../engine/liveMath';

const EXAMPLES = [
  '2(x-3)+5=3x-1',
  'x^2-5x+6=0',
  'x^3-6x^2+11x-6=0',
  '(x+1)/(x-2)=3',
  'sqrt(2x+3)=5',
  '|2x-3|=7',
  '2^x=32',
  'log(x)+log(x-3)=1',
  'sin(x)=1/2',
  '3-2x<=9',
  '2x+3y=6, solve for y',
  'x^4-5x^2+4=0',
];

export const EquationTab = ({ decimal }) => {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || searchParams.get('eq') || '';
  const [value, setValue] = useState(initialQ);
  const [autoSolve, setAutoSolve] = useState(true);
  const ref = useRef(null);

  const { history, addSolvedProblem, recallProblem, recalledProblem } = useMathHistory();

  const { result, setResult, isSolving, forceSolve } = useDebouncedSolve({
    value,
    solveFn: (input) => solveEquation(input, { decimal }),
    delay: 380,
    autoSolve,
    dependencies: [decimal],
  });

  // Listen for recalled problem from history
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'equation' && recalledProblem.payload?.value !== undefined) {
      const recalledVal = recalledProblem.payload.value;
      setValue(recalledVal);
      forceSolve(recalledVal);
    }
  }, [recalledProblem, forceSolve]);

  // If launched with a query param, auto-solve on mount
  useEffect(() => {
    if (initialQ && initialQ.trim()) {
      forceSolve(initialQ.trim());
    }
  }, []);

  // Save successful solve into history
  useEffect(() => {
    if (result && !result.error && value && value.trim().length >= 2) {
      const ans = cleanPlainMath(result.answerTex || '');
      addSolvedProblem({
        tab: 'equation',
        title: `Equation: ${value.trim()}`,
        expression: value.trim(),
        tex: value.trim(),
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { value: value.trim() },
      });
    }
  }, [result, value, addSolvedProblem]);

  const handleExample = (ex) => {
    setValue(ex);
    forceSolve(ex);
  };

  // Filter recent equation problems from history for quick recall
  const recentEquations = useMemo(
    () => history.filter((item) => item.tab === 'equation' && item.expression),
    [history]
  );

  return (
    <div className="as-panel" data-testid="equation-tab">
      <h2 className="as-panel-title">Solve any equation, inequality or expression</h2>

      {/* Unified Input + Live Math Card */}
      <UnifiedMathCard
        id="equation-input"
        inputRef={ref}
        label="Equation / Expression"
        value={value}
        onChange={setValue}
        onSolve={() => forceSolve()}
        placeholder="e.g.  2(x - 3) + 5 = 3x - 1   or   x^2 - 5x + 6 = 0"
        placeholderTex="2(x - 3) + 5 = 3x - 1"
        isSolving={isSolving}
        autoSolve={autoSolve}
        onToggleAutoSolve={() => setAutoSolve((prev) => !prev)}
      />

      {recentEquations.length > 0 && (
        <div className="as-recent-row" data-testid="recent-equation-chips">
          <span className="as-recent-label">
            <History size={12} />
            <span>Recent:</span>
          </span>
          <div className="as-recent-chip-list">
            {recentEquations.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                className="as-recent-chip"
                data-testid={`recent-eq-chip-${item.id}`}
                onClick={() => recallProblem(item)}
                title={`Click to re-solve: ${item.expression} ${item.answer ? `→ ${item.answer}` : ''}`}
              >
                <RotateCcw size={10} className="as-recent-chip-icon" />
                <span className="as-recent-chip-expr">
                  <MathBlock tex={item.tex || toLiveMathTex(item.expression).tex || item.expression} inline={true} />
                </span>
                {(item.answerTex || item.answer) && (
                  <span className="as-recent-chip-ans">
                    <MathBlock tex={item.answerTex || toLiveMathTex(item.answer).tex || item.answer} inline={true} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="as-examples">
        <span className="as-examples-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="as-example-chip"
            data-testid={`equation-example-${ex}`}
            onClick={() => handleExample(ex)}
          >
            <MathBlock tex={toLiveMathTex(ex).tex || ex} inline={true} />
          </button>
        ))}
      </div>

      <SymbolKeyboard
        onKey={(t) => insertAtCursor(ref, value, setValue, t)}
        onBackspace={() => backspaceAtCursor(ref, value, setValue)}
        onClear={() => { setValue(''); setResult(null); }}
      />

      <button
        type="button"
        className="as-solve-btn"
        data-testid="equation-solve-btn"
        onClick={() => forceSolve()}
      >
        {isSolving ? 'Solving...' : 'Solve equation'}
      </button>

      <StepsView
        result={result}
        problemTitle={value ? `Equation: ${value}` : 'Equation Solution'}
        problemTex={value}
        shareParams={{ tab: 'equation', q: value, dec: decimal ? '1' : '0' }}
        decimal={decimal}
      />
    </div>
  );
};
