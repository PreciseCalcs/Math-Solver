import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  History,
  RotateCcw,
  Layers,
  ArrowRightLeft,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { StepsView } from '../components/StepsView';
import { MathBlock } from '../components/MathBlock';
import {
  MATRIX_OPS,
  determinant,
  inverse,
  transpose,
  rref,
  rank,
  trace,
  matrixNorm,
  nullSpace,
  columnSpace,
  rowSpace,
  matrixPower,
  luDecomp,
  matrixAddition,
  matrixSubtraction,
  matrixMultiplication,
  scalarMultiplication,
  eigenvalues,
  matTex,
} from '../engine/matrix';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';

const DEFAULT_A = [
  ['2', '1', '-1'],
  ['-3', '-1', '2'],
  ['-2', '1', '2'],
];

const DEFAULT_B = [
  ['1', '0', '2'],
  ['3', '-1', '1'],
  ['0', '2', '-1'],
];

const MATRIX_CATEGORIES = [
  { id: 'all', label: 'All Operations' },
  { id: 'arithmetic', label: 'Arithmetic & Powers' },
  { id: 'analysis', label: 'Properties & Norms' },
  { id: 'spaces', label: 'Subspaces & RREF' },
  { id: 'decomp', label: 'Decompositions' },
];

const MATRIX_EXAMPLES = [
  {
    label: 'A × B (Multiplication)',
    op: 'multiplication',
    cellsA: [['1', '2'], ['3', '4']],
    cellsB: [['2', '0'], ['1', '2']],
    tex: '\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix} \\times \\begin{bmatrix} 2 & 0 \\\\ 1 & 2 \\end{bmatrix}',
  },
  {
    label: 'A³ (Matrix Power)',
    op: 'power',
    exponent: '3',
    cellsA: [['1', '2'], ['0', '1']],
    tex: '\\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix}^3',
  },
  {
    label: 'Null Space (Kernel)',
    op: 'null_space',
    cellsA: [['1', '2', '2', '3'], ['2', '4', '1', '3'], ['3', '6', '1', '4']],
    tex: '\\operatorname{Null}\\begin{bmatrix} 1 & 2 & 2 & 3 \\\\ 2 & 4 & 1 & 3 \\\\ 3 & 6 & 1 & 4 \\end{bmatrix}',
  },
  {
    label: 'LU Decomposition',
    op: 'lu_decomp',
    cellsA: [['2', '1', '1'], ['4', '-6', '0'], ['-2', '7', '2']],
    tex: 'A = L \\cdot U',
  },
  {
    label: 'tr(A) (Trace)',
    op: 'trace',
    cellsA: [['3', '-1', '2'], ['1', '4', '0'], ['-2', '1', '5']],
    tex: '\\operatorname{tr}\\begin{bmatrix} 3 & -1 & 2 \\\\ 1 & 4 & 0 \\\\ -2 & 1 & 5 \\end{bmatrix}',
  },
  {
    label: '||A|| (Matrix Norms)',
    op: 'norm',
    cellsA: [['1', '-2', '3'], ['0', '4', '-1']],
    tex: '\\|A\\|_F, \\; \\|A\\|_1, \\; \\|A\\|_\\infty',
  },
  {
    label: 'Column Space',
    op: 'column_space',
    cellsA: [['1', '0', '3'], ['2', '1', '4'], ['1', '1', '1']],
    tex: '\\operatorname{Col}(A)',
  },
  {
    label: '3×3 Inverse',
    op: 'inverse',
    cellsA: [['1', '2', '3'], ['0', '1', '4'], ['5', '6', '0']],
    tex: 'A^{-1}',
  },
];

const resize = (cells, targetRows, targetCols) =>
  Array.from({ length: targetRows }, (_, r) =>
    Array.from({ length: targetCols }, (_, c) => cells[r]?.[c] ?? '0')
  );

const makeIdentity = (n) =>
  Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (r === c ? '1' : '0'))
  );

const makeZeros = (r, c) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => '0'));

export const MatrixTab = ({ decimal }) => {
  const [searchParams] = useSearchParams();
  const initialOp = searchParams.get('op') || 'determinant';
  const initialMat = searchParams.get('mat');

  let initialCellsA = DEFAULT_A;
  if (initialMat) {
    try {
      const rows = initialMat.split(';').map((r) => r.split(',').map((c) => c.trim()));
      if (rows.length && rows[0].length) {
        initialCellsA = rows;
      }
    } catch {
      // fallback
    }
  }

  const [op, setOp] = useState(initialOp);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cellsA, setCellsA] = useState(initialCellsA);
  const [cellsB, setCellsB] = useState(DEFAULT_B);
  const [scalarVal, setScalarVal] = useState('2');
  const [exponentVal, setExponentVal] = useState('2');
  const [result, setResult] = useState(null);

  const rowsA = cellsA.length;
  const colsA = cellsA[0]?.length || 0;
  const rowsB = cellsB.length;
  const colsB = cellsB[0]?.length || 0;

  const currentOpConfig = MATRIX_OPS[op] || MATRIX_OPS.determinant;
  const isBinary = currentOpConfig.binary;
  const isPower = currentOpConfig.power;
  const isScalar = currentOpConfig.scalar;

  const { history, addSolvedProblem, recallProblem, recalledProblem } = useMathHistory();
  const recentMatrices = useMemo(
    () => (history || []).filter((h) => h.tab === 'matrix'),
    [history]
  );

  const setCellA = (r, c, val) =>
    setCellsA((prev) =>
      prev.map((row, i) => (i === r ? row.map((x, j) => (j === c ? val : x)) : row))
    );

  const setCellB = (r, c, val) =>
    setCellsB((prev) =>
      prev.map((row, i) => (i === r ? row.map((x, j) => (j === c ? val : x)) : row))
    );

  const setDimensionA = (r, c) => {
    setCellsA((prev) => resize(prev, r, c));
  };

  const setDimensionB = (r, c) => {
    setCellsB((prev) => resize(prev, r, c));
  };

  const swapAB = () => {
    const temp = cellsA;
    setCellsA(cellsB);
    setCellsB(temp);
  };

  const matchDims = () => {
    setCellsB(resize(cellsB, rowsA, colsA));
  };

  const compute = () => {
    // Dimension validation
    if (currentOpConfig.square && rowsA !== colsA) {
      setResult({
        error: `${currentOpConfig.title} requires a square matrix (currently ${rowsA}×${colsA}). Use dimension controls to make it square.`,
      });
      return;
    }

    if (isBinary) {
      if ((op === 'addition' || op === 'subtraction') && (rowsA !== rowsB || colsA !== colsB)) {
        setResult({
          error: `${currentOpConfig.title} requires identical dimensions (Matrix A is ${rowsA}×${colsA}, Matrix B is ${rowsB}×${colsB}). Click "Match Dimensions" to align them.`,
        });
        return;
      }
      if (op === 'multiplication' && colsA !== rowsB) {
        setResult({
          error: `Matrix multiplication A × B requires columns of A (${colsA}) to match rows of B (${rowsB}). Current: (${rowsA}×${colsA}) × (${rowsB}×${colsB}).`,
        });
        return;
      }
    }

    try {
      let res;
      switch (op) {
        case 'addition':
          res = matrixAddition(cellsA, cellsB, decimal);
          break;
        case 'subtraction':
          res = matrixSubtraction(cellsA, cellsB, decimal);
          break;
        case 'multiplication':
          res = matrixMultiplication(cellsA, cellsB, decimal);
          break;
        case 'power':
          res = matrixPower(cellsA, decimal, exponentVal);
          break;
        case 'scalar_mult':
          res = scalarMultiplication(cellsA, scalarVal, decimal);
          break;
        case 'determinant':
          res = determinant(cellsA, decimal);
          break;
        case 'inverse':
          res = inverse(cellsA, decimal);
          break;
        case 'transpose':
          res = transpose(cellsA, decimal);
          break;
        case 'trace':
          res = trace(cellsA, decimal);
          break;
        case 'norm':
          res = matrixNorm(cellsA, decimal);
          break;
        case 'rref':
          res = rref(cellsA, decimal);
          break;
        case 'rank':
          res = rank(cellsA, decimal);
          break;
        case 'null_space':
          res = nullSpace(cellsA, decimal);
          break;
        case 'column_space':
          res = columnSpace(cellsA, decimal);
          break;
        case 'row_space':
          res = rowSpace(cellsA, decimal);
          break;
        case 'lu_decomp':
          res = luDecomp(cellsA, decimal);
          break;
        case 'eigenvalues':
          res = eigenvalues(cellsA, decimal);
          break;
        default:
          res = determinant(cellsA, decimal);
      }
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  // Recalled problem from history drawer
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'matrix' && recalledProblem.payload) {
      const nextOp = recalledProblem.payload.op || 'determinant';
      const nextCellsA = recalledProblem.payload.cellsA || recalledProblem.payload.cells || DEFAULT_A;
      const nextCellsB = recalledProblem.payload.cellsB || DEFAULT_B;
      const nextScalar = recalledProblem.payload.scalarVal || '2';
      const nextExponent = recalledProblem.payload.exponentVal || '2';

      setOp(nextOp);
      setCellsA(nextCellsA);
      setCellsB(nextCellsB);
      setScalarVal(nextScalar);
      setExponentVal(nextExponent);

      // Auto-compute recalled
      try {
        const conf = MATRIX_OPS[nextOp];
        if (conf) {
          if (nextOp === 'addition') setResult(matrixAddition(nextCellsA, nextCellsB, decimal));
          else if (nextOp === 'subtraction') setResult(matrixSubtraction(nextCellsA, nextCellsB, decimal));
          else if (nextOp === 'multiplication') setResult(matrixMultiplication(nextCellsA, nextCellsB, decimal));
          else if (nextOp === 'power') setResult(matrixPower(nextCellsA, decimal, nextExponent));
          else if (nextOp === 'scalar_mult') setResult(scalarMultiplication(nextCellsA, nextScalar, decimal));
          else if (nextOp === 'trace') setResult(trace(nextCellsA, decimal));
          else if (nextOp === 'norm') setResult(matrixNorm(nextCellsA, decimal));
          else if (nextOp === 'null_space') setResult(nullSpace(nextCellsA, decimal));
          else if (nextOp === 'column_space') setResult(columnSpace(nextCellsA, decimal));
          else if (nextOp === 'row_space') setResult(rowSpace(nextCellsA, decimal));
          else if (nextOp === 'lu_decomp') setResult(luDecomp(nextCellsA, decimal));
          else if (nextOp === 'inverse') setResult(inverse(nextCellsA, decimal));
          else if (nextOp === 'transpose') setResult(transpose(nextCellsA, decimal));
          else if (nextOp === 'rank') setResult(rank(nextCellsA, decimal));
          else if (nextOp === 'rref') setResult(rref(nextCellsA, decimal));
          else if (nextOp === 'eigenvalues') setResult(eigenvalues(nextCellsA, decimal));
          else setResult(determinant(nextCellsA, decimal));
        }
      } catch (e) {
        setResult({ error: e.message });
      }
    }
  }, [recalledProblem, decimal]);

  // Save successful solve to history
  useEffect(() => {
    if (result && !result.error && cellsA.length > 0) {
      const opTitle = currentOpConfig.title || op;
      const ans = cleanPlainMath(result.answerTex || '');
      let expr = `${opTitle} (${rowsA}×${colsA})`;
      let texStr = `\\begin{bmatrix} ${cellsA.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;

      if (isBinary) {
        const sign = op === 'addition' ? '+' : op === 'subtraction' ? '-' : '\\times';
        texStr = `${texStr} ${sign} \\begin{bmatrix} ${cellsB.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
        expr = `A (${rowsA}×${colsA}) ${op === 'addition' ? '+' : op === 'subtraction' ? '-' : '×'} B (${rowsB}×${colsB})`;
      } else if (isPower) {
        texStr = `${texStr}^{${exponentVal}}`;
        expr = `A^${exponentVal} (${rowsA}×${colsA})`;
      } else if (isScalar) {
        texStr = `${scalarVal} \\cdot ${texStr}`;
        expr = `${scalarVal} · A (${rowsA}×${colsA})`;
      }

      addSolvedProblem(
        {
          tab: 'matrix',
          title: `Matrix: ${expr}`,
          expression: expr,
          tex: texStr,
          answer: ans,
          answerTex: result.answerTex || '',
          payload: { op, cellsA, cellsB, scalarVal, exponentVal },
        },
        { immediate: true }
      );
    }
  }, [result, op, cellsA, cellsB, scalarVal, exponentVal, rowsA, colsA, rowsB, colsB, addSolvedProblem, isBinary, isPower, isScalar, currentOpConfig.title]);

  // Initial auto-solve if URL params present
  useEffect(() => {
    if (searchParams.get('mat') || searchParams.get('op')) {
      compute();
    }
  }, []);

  // Filtered operations by category
  const filteredOps = Object.entries(MATRIX_OPS).filter(([, conf]) => {
    if (activeCategory === 'all') return true;
    return conf.category === activeCategory;
  });

  // Generate live formula preview LaTeX
  const previewTex = useMemo(() => {
    const aTex = `\\begin{bmatrix} ${cellsA.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
    const bTex = `\\begin{bmatrix} ${cellsB.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;

    if (op === 'addition') return `A + B = ${aTex} + ${bTex}`;
    if (op === 'subtraction') return `A - B = ${aTex} - ${bTex}`;
    if (op === 'multiplication') return `A \\cdot B = ${aTex} \\cdot ${bTex}`;
    if (op === 'power') return `A^{${exponentVal || 'k'}} = ${aTex}^{${exponentVal || 'k'}}`;
    if (op === 'scalar_mult') return `c \\cdot A = (${scalarVal || 'c'}) \\cdot ${aTex}`;
    if (op === 'determinant') return `\\det(A) = \\det\\left(${aTex}\\right)`;
    if (op === 'inverse') return `A^{-1} = \\left(${aTex}\\right)^{-1}`;
    if (op === 'transpose') return `A^{T} = \\left(${aTex}\\right)^{T}`;
    if (op === 'trace') return `\\operatorname{tr}(A) = \\operatorname{tr}\\left(${aTex}\\right)`;
    if (op === 'norm') return `\\|A\\| \\text{ of } ${aTex}`;
    if (op === 'null_space') return `\\operatorname{Null}(A) \\implies ${aTex} \\mathbf{x} = \\mathbf{0}`;
    if (op === 'column_space') return `\\operatorname{Col}(A) = \\operatorname{span}\\left(\\text{cols of } ${aTex}\\right)`;
    if (op === 'row_space') return `\\operatorname{Row}(A) = \\operatorname{span}\\left(\\text{rows of } ${aTex}\\right)`;
    if (op === 'lu_decomp') return `A = L \\cdot U \\implies ${aTex}`;
    if (op === 'eigenvalues') return `\\det(A - \\lambda I) = 0 \\implies \\det\\left(${aTex} - \\lambda I\\right) = 0`;
    return `A = ${aTex}`;
  }, [op, cellsA, cellsB, scalarVal, exponentVal]);

  return (
    <div className="as-panel" data-testid="matrix-tab">
      <div className="as-panel-header" style={{ marginBottom: '14px' }}>
        <div>
          <h2 className="as-panel-title" style={{ margin: 0 }}>Advanced Matrix Calculator</h2>
          <p className="as-hero-sub" style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>
            Exact fraction step-by-step arithmetic, linear subspaces, matrix powers, norms, and decompositions.
          </p>
        </div>
      </div>

      {/* Operation Categories */}
      <div className="as-matrix-categories" data-testid="matrix-categories">
        {MATRIX_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`as-matrix-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Operations Grid */}
      <div className="as-matrix-op-grid" data-testid="matrix-op-grid">
        {filteredOps.map(([key, conf]) => (
          <button
            key={key}
            type="button"
            className={`as-matrix-op-card ${op === key ? 'active' : ''}`}
            data-testid={`matrix-op-${key}`}
            onClick={() => {
              setOp(key);
              setResult(null);
            }}
          >
            <span className="as-matrix-op-label">{conf.label}</span>
            <span className="as-matrix-op-title">{conf.title}</span>
          </button>
        ))}
      </div>

      {/* Exponent Input for Power */}
      {isPower && (
        <div className="as-matrix-param-bar" data-testid="matrix-power-param">
          <span className="as-matrix-param-label">Exponent (k):</span>
          <input
            type="number"
            min="-4"
            max="8"
            className="as-matrix-param-input"
            value={exponentVal}
            onChange={(e) => setExponentVal(e.target.value)}
            placeholder="2"
          />
          <div className="as-matrix-param-quick">
            {['0', '2', '3', '4', '-1'].map((val) => (
              <button
                key={val}
                type="button"
                className="as-matrix-param-chip"
                onClick={() => setExponentVal(val)}
              >
                k = {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scalar Input */}
      {isScalar && (
        <div className="as-matrix-param-bar" data-testid="matrix-scalar-param">
          <span className="as-matrix-param-label">Scalar constant (c):</span>
          <input
            type="text"
            className="as-matrix-param-input"
            value={scalarVal}
            onChange={(e) => setScalarVal(e.target.value)}
            placeholder="2 or 1/2"
          />
          <div className="as-matrix-param-quick">
            {['2', '3', '-1', '1/2', '-2'].map((val) => (
              <button
                key={val}
                type="button"
                className="as-matrix-param-chip"
                onClick={() => setScalarVal(val)}
              >
                c = {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matrix Workspace: Single vs Dual Matrix */}
      <div className={isBinary ? 'as-matrix-dual-container' : ''}>
        {/* Matrix A */}
        <div className={isBinary ? 'as-matrix-block' : ''}>
          <div className="as-matrix-block-header">
            <span className="as-matrix-block-title">
              {isBinary ? 'Matrix A' : 'Matrix'}
              <span className="as-dim-label" style={{ fontWeight: 'normal' }}>
                ({rowsA} × {colsA})
              </span>
            </span>
            <div className="as-matrix-quick-presets">
              <button type="button" className="as-matrix-preset-btn" onClick={() => setDimensionA(2, 2)}>2×2</button>
              <button type="button" className="as-matrix-preset-btn" onClick={() => setDimensionA(3, 3)}>3×3</button>
              <button type="button" className="as-matrix-preset-btn" onClick={() => setDimensionA(4, 4)}>4×4</button>
              <button
                type="button"
                className="as-matrix-preset-btn"
                title="Identity Matrix"
                onClick={() => setCellsA(makeIdentity(rowsA))}
              >
                I
              </button>
              <button
                type="button"
                className="as-matrix-preset-btn"
                title="Zero Matrix"
                onClick={() => setCellsA(makeZeros(rowsA, colsA))}
              >
                0
              </button>
            </div>
          </div>

          <div className="as-matrix-controls">
            <button
              type="button"
              className="as-dim-btn"
              data-testid="matrix-a-add-row"
              disabled={rowsA >= 6}
              onClick={() => setCellsA(resize(cellsA, rowsA + 1, colsA))}
            >
              + Row
            </button>
            <button
              type="button"
              className="as-dim-btn"
              data-testid="matrix-a-remove-row"
              disabled={rowsA <= 1}
              onClick={() => setCellsA(resize(cellsA, rowsA - 1, colsA))}
            >
              − Row
            </button>
            <button
              type="button"
              className="as-dim-btn"
              data-testid="matrix-a-add-col"
              disabled={colsA >= 6}
              onClick={() => setCellsA(resize(cellsA, rowsA, colsA + 1))}
            >
              + Col
            </button>
            <button
              type="button"
              className="as-dim-btn"
              data-testid="matrix-a-remove-col"
              disabled={colsA <= 1}
              onClick={() => setCellsA(resize(cellsA, rowsA, colsA - 1))}
            >
              − Col
            </button>
          </div>

          <div className="as-matrix-grid" data-testid="matrix-grid-a">
            {cellsA.map((row, r) => (
              <div className="as-matrix-row" key={r}>
                {row.map((val, c) => (
                  <input
                    key={c}
                    className="as-matrix-cell"
                    data-testid={`matrix-cell-a-${r}-${c}`}
                    value={val}
                    onChange={(e) => setCellA(r, c, e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Operator Badge in between if binary */}
        {isBinary && (
          <div className="as-matrix-op-sign">
            {op === 'addition' ? '+' : op === 'subtraction' ? '−' : '×'}
          </div>
        )}

        {/* Matrix B for Binary Operations */}
        {isBinary && (
          <div className="as-matrix-block">
            <div className="as-matrix-block-header">
              <span className="as-matrix-block-title">
                Matrix B
                <span className="as-dim-label" style={{ fontWeight: 'normal' }}>
                  ({rowsB} × {colsB})
                </span>
              </span>
              <div className="as-matrix-quick-presets">
                <button type="button" className="as-matrix-preset-btn" onClick={() => setDimensionB(2, 2)}>2×2</button>
                <button type="button" className="as-matrix-preset-btn" onClick={() => setDimensionB(3, 3)}>3×3</button>
                <button type="button" className="as-matrix-preset-btn" onClick={() => setDimensionB(4, 4)}>4×4</button>
                <button type="button" className="as-matrix-preset-btn" onClick={matchDims} title="Set B dimensions to match A">
                  Match A
                </button>
                <button type="button" className="as-matrix-preset-btn" onClick={swapAB} title="Swap Matrix A and Matrix B">
                  Swap A ↔ B
                </button>
              </div>
            </div>

            <div className="as-matrix-controls">
              <button
                type="button"
                className="as-dim-btn"
                data-testid="matrix-b-add-row"
                disabled={rowsB >= 6}
                onClick={() => setCellsB(resize(cellsB, rowsB + 1, colsB))}
              >
                + Row
              </button>
              <button
                type="button"
                className="as-dim-btn"
                data-testid="matrix-b-remove-row"
                disabled={rowsB <= 1}
                onClick={() => setCellsB(resize(cellsB, rowsB - 1, colsB))}
              >
                − Row
              </button>
              <button
                type="button"
                className="as-dim-btn"
                data-testid="matrix-b-add-col"
                disabled={colsB >= 6}
                onClick={() => setCellsB(resize(cellsB, rowsB, colsB + 1))}
              >
                + Col
              </button>
              <button
                type="button"
                className="as-dim-btn"
                data-testid="matrix-b-remove-col"
                disabled={colsB <= 1}
                onClick={() => setCellsB(resize(cellsB, rowsB, colsB - 1))}
              >
                − Col
              </button>
            </div>

            <div className="as-matrix-grid" data-testid="matrix-grid-b">
              {cellsB.map((row, r) => (
                <div className="as-matrix-row" key={r}>
                  {row.map((val, c) => (
                    <input
                      key={c}
                      className="as-matrix-cell"
                      data-testid={`matrix-cell-b-${r}-${c}`}
                      value={val}
                      onChange={(e) => setCellB(r, c, e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="as-hint">Exact fractions supported in all cells, e.g. 1/2, -3/4, or 0.25.</p>

      {/* Dimension Warning Banner if Incompatible */}
      {currentOpConfig.square && rowsA !== colsA && (
        <div className="as-matrix-warning" data-testid="matrix-square-warning">
          <AlertCircle size={15} />
          <span>
            {currentOpConfig.title} requires a square matrix. Current matrix is {rowsA}×{colsA}.
          </span>
        </div>
      )}
      {isBinary && (op === 'addition' || op === 'subtraction') && (rowsA !== rowsB || colsA !== colsB) && (
        <div className="as-matrix-warning">
          <AlertCircle size={15} />
          <span>
            Addition and Subtraction require equal dimensions. Matrix A is {rowsA}×{colsA}, Matrix B is {rowsB}×{colsB}. Click "Match A" to equalize.
          </span>
        </div>
      )}
      {isBinary && op === 'multiplication' && colsA !== rowsB && (
        <div className="as-matrix-warning">
          <AlertCircle size={15} />
          <span>
            Multiplication A × B requires columns of A ({colsA}) to equal rows of B ({rowsB}).
          </span>
        </div>
      )}

      {/* Recent Matrix Problems */}
      {recentMatrices.length > 0 && (
        <div className="as-recent-row" data-testid="recent-matrix-chips">
          <span className="as-recent-label">
            <History size={12} />
            <span>Recent:</span>
          </span>
          <div className="as-recent-chip-list">
            {recentMatrices.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                className="as-recent-chip"
                data-testid={`recent-matrix-chip-${item.id}`}
                onClick={() => recallProblem(item)}
                title={`Click to re-solve: ${item.expression}`}
              >
                <RotateCcw size={10} className="as-recent-chip-icon" />
                <span className="as-recent-chip-expr">
                  <MathBlock tex={item.tex || item.expression} inline={true} />
                </span>
                {(item.answerTex || item.answer) && (
                  <span className="as-recent-chip-ans">
                    <MathBlock tex={item.answerTex || item.answer} inline={true} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Example Chips */}
      <div className="as-examples" data-testid="matrix-examples">
        <span className="as-examples-label">Try:</span>
        {MATRIX_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="as-example-chip"
            data-testid={`matrix-example-${i}`}
            onClick={() => {
              setOp(ex.op);
              setCellsA(ex.cellsA);
              if (ex.cellsB) setCellsB(ex.cellsB);
              if (ex.exponent) setExponentVal(ex.exponent);
              const conf = MATRIX_OPS[ex.op];
              try {
                if (ex.op === 'addition') setResult(matrixAddition(ex.cellsA, ex.cellsB, decimal));
                else if (ex.op === 'subtraction') setResult(matrixSubtraction(ex.cellsA, ex.cellsB, decimal));
                else if (ex.op === 'multiplication') setResult(matrixMultiplication(ex.cellsA, ex.cellsB, decimal));
                else if (ex.op === 'power') setResult(matrixPower(ex.cellsA, decimal, ex.exponent || '2'));
                else if (ex.op === 'trace') setResult(trace(ex.cellsA, decimal));
                else if (ex.op === 'norm') setResult(matrixNorm(ex.cellsA, decimal));
                else if (ex.op === 'null_space') setResult(nullSpace(ex.cellsA, decimal));
                else if (ex.op === 'column_space') setResult(columnSpace(ex.cellsA, decimal));
                else if (ex.op === 'row_space') setResult(rowSpace(ex.cellsA, decimal));
                else if (ex.op === 'lu_decomp') setResult(luDecomp(ex.cellsA, decimal));
                else if (ex.op === 'inverse') setResult(inverse(ex.cellsA, decimal));
                else setResult(conf.fn(ex.cellsA, decimal));
              } catch (e) {
                setResult({ error: e.message });
              }
            }}
          >
            <strong>{ex.label}:</strong>{' '}
            <MathBlock tex={ex.tex} inline={true} />
          </button>
        ))}
      </div>

      {/* Live Math Preview */}
      <div className="as-live-math-container" style={{ marginTop: '14px', marginBottom: '14px' }}>
        <div className="as-live-math-header">
          <span className="as-live-math-title">Preview</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--as-muted)' }}>
            {currentOpConfig.desc}
          </span>
        </div>
        <div className="as-live-math-card">
          <MathBlock tex={previewTex} />
        </div>
      </div>

      {/* Compute Button */}
      <button
        type="button"
        className="as-solve-btn"
        data-testid="matrix-compute-btn"
        onClick={compute}
      >
        Compute {currentOpConfig.title}
      </button>

      {/* Step-by-step Solution View */}
      <StepsView
        result={result}
        problemTitle={`Matrix: ${currentOpConfig.title} (${rowsA}×${colsA})`}
        problemTex={previewTex}
        shareParams={{
          tab: 'matrix',
          op,
          mat: cellsA.map((r) => r.join(',')).join(';'),
          dec: decimal ? '1' : '0',
        }}
        decimal={decimal}
      />
    </div>
  );
};
