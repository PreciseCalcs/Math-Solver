import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StepsView } from '../components/StepsView';
import { MathBlock } from '../components/MathBlock';
import { MATRIX_OPS } from '../engine/matrix';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';

const DEFAULT = [
  ['2', '1', '-1'],
  ['-3', '-1', '2'],
  ['-2', '1', '2'],
];

const resize = (cells, rows, cols) =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => cells[r]?.[c] ?? '0')
  );

export const MatrixTab = ({ decimal }) => {
  const [searchParams] = useSearchParams();
  const initialOp = searchParams.get('op') || 'determinant';
  const initialMat = searchParams.get('mat');

  let initialCells = DEFAULT;
  if (initialMat) {
    try {
      const rows = initialMat.split(';').map((r) => r.split(',').map((c) => c.trim()));
      if (rows.length && rows[0].length) {
        initialCells = rows;
      }
    } catch {
      // fallback
    }
  }

  const [op, setOp] = useState(initialOp);
  const [cells, setCells] = useState(initialCells);
  const [result, setResult] = useState(null);
  const rows = cells.length, cols = cells[0].length;

  const { addSolvedProblem, recalledProblem } = useMathHistory();

  const setCell = (r, c, val) =>
    setCells((prev) => prev.map((row, i) => (i === r ? row.map((x, j) => (j === c ? val : x)) : row)));

  const compute = () => {
    const conf = MATRIX_OPS[op];
    if (conf.square && rows !== cols) {
      setResult({ error: `${conf.label} requires a square matrix (currently ${rows}×${cols}). Use +Row / +Col to make it square.` });
      return;
    }
    try {
      setResult(conf.fn(cells, decimal));
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  // Listen for recalled problem from history
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'matrix' && recalledProblem.payload) {
      const nextOp = recalledProblem.payload.op || 'determinant';
      const nextCells = recalledProblem.payload.cells || DEFAULT;
      setOp(nextOp);
      setCells(nextCells);
      const conf = MATRIX_OPS[nextOp];
      if (conf && (!conf.square || nextCells.length === nextCells[0]?.length)) {
        try {
          setResult(conf.fn(nextCells, decimal));
        } catch (e) {
          setResult({ error: e.message });
        }
      }
    }
  }, [recalledProblem, decimal]);

  // Save successful solve to history
  useEffect(() => {
    if (result && !result.error && cells.length > 0 && cells[0]?.length > 0) {
      const opLabel = MATRIX_OPS[op]?.label || op;
      const ans = cleanPlainMath(result.answerTex || '');
      addSolvedProblem({
        tab: 'matrix',
        title: `Matrix: ${opLabel} (${rows}×${cols})`,
        expression: `${opLabel} (${rows}×${cols})`,
        tex: `\\begin{bmatrix} ${cells.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`,
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { op, cells },
      }, { immediate: true });
    }
  }, [result, op, cells, rows, cols, addSolvedProblem]);

  useEffect(() => {
    if (searchParams.get('mat') || searchParams.get('op')) {
      compute();
    }
  }, []);

  return (
    <div className="as-panel" data-testid="matrix-tab">
      <h2 className="as-panel-title">Matrix algebra</h2>
      <div className="as-pills">
        {Object.entries(MATRIX_OPS).map(([key, conf]) => (
          <button
            key={key}
            type="button"
            className={`as-pill ${op === key ? 'active' : ''}`}
            data-testid={`matrix-op-${key}`}
            onClick={() => setOp(key)}
          >
            {conf.label}
          </button>
        ))}
      </div>
      <div className="as-matrix-controls">
        <button type="button" className="as-dim-btn" data-testid="matrix-add-row" disabled={rows >= 6} onClick={() => setCells(resize(cells, rows + 1, cols))}>+ Row</button>
        <button type="button" className="as-dim-btn" data-testid="matrix-remove-row" disabled={rows <= 1} onClick={() => setCells(resize(cells, rows - 1, cols))}>− Row</button>
        <button type="button" className="as-dim-btn" data-testid="matrix-add-col" disabled={cols >= 6} onClick={() => setCells(resize(cells, rows, cols + 1))}>+ Col</button>
        <button type="button" className="as-dim-btn" data-testid="matrix-remove-col" disabled={cols <= 1} onClick={() => setCells(resize(cells, rows, cols - 1))}>− Col</button>
        <span className="as-dim-label" data-testid="matrix-dims">{rows} × {cols}</span>
      </div>
      <div className="as-matrix-grid" data-testid="matrix-grid">
        {cells.map((row, r) => (
          <div className="as-matrix-row" key={r}>
            {row.map((val, c) => (
              <input
                key={c}
                className="as-matrix-cell"
                data-testid={`matrix-cell-${r}-${c}`}
                value={val}
                onChange={(e) => setCell(r, c, e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="as-hint">Fractions allowed in cells, e.g. 1/2 or -3/4.</p>

      {cells.length > 0 && (
        <div className="as-live-math-container" style={{ marginTop: '12px', marginBottom: '12px' }}>
          <div className="as-live-math-header">
            <span className="as-live-math-title">Matrix Preview (LaTeX)</span>
          </div>
          <div className="as-live-math-card">
            <MathBlock tex={`\\begin{bmatrix} ${cells.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`} />
          </div>
        </div>
      )}

      <button type="button" className="as-solve-btn" data-testid="matrix-compute-btn" onClick={compute}>
        Compute
      </button>
      <StepsView
        result={result}
        problemTitle={`Matrix: ${MATRIX_OPS[op]?.label || op} (${rows}×${cols})`}
        problemTex={`\\begin{bmatrix} ${cells.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`}
        shareParams={{
          tab: 'matrix',
          op,
          mat: cells.map((r) => r.join(',')).join(';'),
          dec: decimal ? '1' : '0',
        }}
        decimal={decimal}
      />
    </div>
  );
};
