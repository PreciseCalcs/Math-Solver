import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, RotateCcw } from 'lucide-react';
import { SymbolKeyboard, insertAtCursor, backspaceAtCursor } from '../components/SymbolKeyboard';
import { StepsView } from '../components/StepsView';
import { UnifiedMathCard } from '../components/UnifiedMathCard';
import { solveComplex } from '../engine/complexnum';
import { useDebouncedSolve } from '../hooks/useDebouncedSolve';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';
import { MathBlock } from '../components/MathBlock';
import { toLiveMathTex } from '../engine/liveMath';

const EXAMPLES = ['(3+2i)(1-4i)', '(2+3i)/(1-i)', '(1+i)^8', 'sqrt(-16)', 'i^2026'];

export const ComplexTab = ({ decimal }) => {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [value, setValue] = useState(initialQ);
  const [autoSolve, setAutoSolve] = useState(true);
  const ref = useRef(null);

  const { history, addSolvedProblem, recallProblem, recalledProblem } = useMathHistory();

  const { result, setResult, isSolving, forceSolve } = useDebouncedSolve({
    value,
    solveFn: (input) => solveComplex(input, { decimal }),
    delay: 380,
    autoSolve,
    dependencies: [decimal],
  });

  // Listen for recalled problem from history
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'complex' && recalledProblem.payload?.value !== undefined) {
      const recalledVal = recalledProblem.payload.value;
      setValue(recalledVal);
      forceSolve(recalledVal);
    }
  }, [recalledProblem, forceSolve]);

  // Save successful solve into history
  useEffect(() => {
    if (result && !result.error && value && value.trim().length >= 2) {
      const ans = cleanPlainMath(result.answerTex || '');
      addSolvedProblem({
        tab: 'complex',
        title: `Complex: ${value.trim()}`,
        expression: value.trim(),
        tex: value.trim(),
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { value: value.trim() },
      });
    }
  }, [result, value, addSolvedProblem]);

  useEffect(() => {
    if (initialQ && initialQ.trim()) {
      forceSolve(initialQ.trim());
    }
  }, []);

  const handleExample = (ex) => {
    setValue(ex);
    forceSolve(ex);
  };

  const recentComplex = useMemo(
    () => history.filter((item) => item.tab === 'complex' && item.expression),
    [history]
  );

  return (
    <div className="as-panel" data-testid="complex-tab">
      <h2 className="as-panel-title">Complex number arithmetic</h2>

      <UnifiedMathCard
        id="complex-input"
        inputRef={ref}
        label="Expression in i"
        value={value}
        onChange={setValue}
        onSolve={() => forceSolve()}
        placeholder="e.g.  (3 + 2i) * (1 - 4i)"
        placeholderTex="(3 + 2i)(1 - 4i)"
        isSolving={isSolving}
        autoSolve={autoSolve}
        onToggleAutoSolve={() => setAutoSolve((prev) => !prev)}
      />

      {recentComplex.length > 0 && (
        <div className="as-recent-row" data-testid="recent-complex-chips">
          <span className="as-recent-label">
            <History size={12} />
            <span>Recent:</span>
          </span>
          <div className="as-recent-chip-list">
            {recentComplex.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                className="as-recent-chip"
                data-testid={`recent-complex-chip-${item.id}`}
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
            data-testid={`complex-example-${ex}`}
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
        data-testid="complex-solve-btn"
        onClick={() => forceSolve()}
      >
        {isSolving ? 'Evaluating...' : 'Evaluate'}
      </button>

      <StepsView
        result={result}
        problemTitle={value ? `Complex Expression: ${value}` : 'Complex Number Arithmetic'}
        problemTex={value}
        shareParams={{ tab: 'complex', q: value, dec: decimal ? '1' : '0' }}
        decimal={decimal}
      />
    </div>
  );
};
