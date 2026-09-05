// Complete System of Equations Solver:
// Methods supported:
// 1. Gauss-Jordan Elimination (Augmented matrix RREF with row operations)
// 2. Cramer's Rule (Determinants D, Dx, Dy, Dz... with step-by-step expansions)
// 3. Substitution Method (Variable isolation, substitution, simplification, back-substitution)
// 4. Matrix Inversion Method (X = A⁻¹ * B with determinant, inverse matrix, and vector product)
// 5. Non-linear Systems (Quadratic/circle/conic/hyperbola/polynomial substitution with exact solutions)

import {
  math, preprocess, texExpr, texFrac, fmtVal, approxFrac, trimNum,
} from './utils.js';
import { solvePolynomial, polyCoeffsFromExpr, polyTexFromFracs } from './poly.js';

const F = (x) => math.fraction(x);
const isZero = (f) => math.number(f) === 0;

// Format matrix as LaTeX
function matTex(M, label = 'bmatrix') {
  const rows = M.map((row) => row.map((f) => texFrac(f)).join(' & ')).join(' \\\\ ');
  return `\\begin{${label}} ${rows} \\end{${label}}`;
}

// Format augmented matrix [A | B]
function augTex(M, nVars) {
  const cols = `${'c'.repeat(nVars)}|c`;
  const rows = M.map((row) => row.map((f) => texFrac(f)).join(' & ')).join(' \\\\ ');
  return `\\left[\\begin{array}{${cols}} ${rows} \\end{array}\\right]`;
}

// 2x2 determinant with exact fractions
function det2(M) {
  return math.subtract(math.multiply(M[0][0], M[1][1]), math.multiply(M[0][1], M[1][0]));
}

// Minor matrix omitting row i and col j
function minor(M, i, j) {
  return M.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
}

// Recursive determinant for fractions
function detRec(M) {
  const n = M.length;
  if (n === 1) return M[0][0];
  if (n === 2) return det2(M);
  let acc = math.fraction(0);
  for (let j = 0; j < n; j++) {
    if (isZero(M[0][j])) continue;
    const cof = math.multiply(M[0][j], detRec(minor(M, 0, j)));
    acc = (j % 2 === 0) ? math.add(acc, cof) : math.subtract(acc, cof);
  }
  return acc;
}

// Format 2x2 determinant calculation step
function det2TexStep(M) {
  const a = texFrac(M[0][0]), b = texFrac(M[0][1]);
  const c = texFrac(M[1][0]), d = texFrac(M[1][1]);
  const val = det2(M);
  return `(${a})(${d}) - (${b})(${c}) = ${texFrac(val)}`;
}

// Format 3x3 determinant calculation step with cofactors
function det3TexStep(M) {
  const m00 = det2(minor(M, 0, 0));
  const m01 = det2(minor(M, 0, 1));
  const m02 = det2(minor(M, 0, 2));
  const val = detRec(M);

  const a = texFrac(M[0][0]), b = texFrac(M[0][1]), c = texFrac(M[0][2]);
  return `(${a})(${texFrac(m00)}) - (${b})(${texFrac(m01)}) + (${c})(${texFrac(m02)}) = ${texFrac(val)}`;
}

/**
 * Classify whether a system of equations is linear or non-linear
 */
function analyzeSystemLinearity(varNames, eqStrings) {
  for (const eqRaw of eqStrings) {
    const s = preprocess(eqRaw);
    const parts = s.split('=');
    if (parts.length !== 2) return { error: `Equation "${eqRaw}" must have exactly one "=" sign.` };
    const expr = `(${parts[0]}) - (${parts[1]})`;
    let compiled;
    try {
      compiled = math.compile(expr);
    } catch {
      return { error: `Could not parse equation "${eqRaw}".` };
    }

    const scope0 = Object.fromEntries(varNames.map((v) => [v, 0]));
    let c0;
    try {
      c0 = compiled.evaluate(scope0);
    } catch {
      return { error: `Equation "${eqRaw}" contains unknown variables or functions.` };
    }

    const coefs = [];
    for (const v of varNames) {
      const a1 = compiled.evaluate({ ...scope0, [v]: 1 }) - c0;
      const a2 = compiled.evaluate({ ...scope0, [v]: 2 }) - c0;
      // If second derivative != 0, it's non-linear
      if (Math.abs(a2 - 2 * a1) > 1e-6 * Math.max(1, Math.abs(a1))) {
        return { isLinear: false, nonLinearEq: eqRaw, nonLinearVar: v };
      }
      coefs.push(a1);
    }

    // Check cross-terms (e.g. x * y)
    const sumAll = compiled.evaluate(Object.fromEntries(varNames.map((v) => [v, 1])));
    if (Math.abs(sumAll - (c0 + coefs.reduce((a, b) => a + b, 0))) > 1e-6) {
      return { isLinear: false, nonLinearEq: eqRaw, reason: 'Cross-terms detected (e.g. products of variables)' };
    }
  }

  return { isLinear: true };
}

/**
 * Solve a Linear System using Gauss-Jordan Elimination
 */
function solveGaussJordan(varNames, M, n, decimal) {
  const steps = [];
  const rows = M.length;

  steps.push({
    title: 'Set up the Augmented Matrix [A | B]',
    desc: `Place the coefficients of ${varNames.join(', ')} on the left, and the constant terms on the right.`,
    tex: augTex(M, n),
  });

  let pivotRow = 0;
  const pivotCols = [];

  for (let col = 0; col < n && pivotRow < rows; col++) {
    let sel = -1;
    for (let r = pivotRow; r < rows; r++) {
      if (!isZero(M[r][col])) {
        sel = r;
        break;
      }
    }
    if (sel === -1) continue;

    const ops = [];
    if (sel !== pivotRow) {
      [M[sel], M[pivotRow]] = [M[pivotRow], M[sel]];
      ops.push(`R_{${pivotRow + 1}} \\leftrightarrow R_{${sel + 1}}`);
    }

    const piv = M[pivotRow][col];
    if (math.number(piv) !== 1) {
      for (let c = 0; c <= n; c++) {
        M[pivotRow][c] = math.divide(M[pivotRow][c], piv);
      }
      ops.push(`R_{${pivotRow + 1}} \\to \\tfrac{1}{${texFrac(piv)}} R_{${pivotRow + 1}}`);
    }

    for (let r = 0; r < rows; r++) {
      if (r === pivotRow || isZero(M[r][col])) continue;
      const factor = M[r][col];
      for (let c = 0; c <= n; c++) {
        M[r][c] = math.subtract(M[r][c], math.multiply(factor, M[pivotRow][c]));
      }
      ops.push(`R_{${r + 1}} \\to R_{${r + 1}} - (${texFrac(factor)}) R_{${pivotRow + 1}}`);
    }

    steps.push({
      title: `Eliminate column ${col + 1} (Pivot for ${varNames[col]})`,
      desc: 'Apply elementary row operations to obtain a pivot of 1 and zeros in the rest of the column:',
      tex: `${ops.join(', \\quad ')} \\;\\implies\\; ${augTex(M, n)}`,
    });

    pivotCols.push(col);
    pivotRow++;
  }

  // Check consistency
  for (let r = 0; r < rows; r++) {
    const allZero = M[r].slice(0, n).every(isZero);
    if (allZero && !isZero(M[r][n])) {
      steps.push({
        title: 'Inconsistent System (No Solution)',
        desc: `Row ${r + 1} simplifies to 0 = ${texFrac(M[r][n])}, which is a mathematical contradiction.`,
        tex: `0 = ${texFrac(M[r][n])}`,
      });
      return { steps, answerTex: '\\text{No solution — inconsistent system.}' };
    }
  }

  if (pivotCols.length < n) {
    const free = varNames.filter((_, i) => !pivotCols.includes(i));
    steps.push({
      title: 'Infinitely Many Solutions (Free Variables)',
      desc: `The number of pivots (${pivotCols.length}) is less than the number of unknowns (${n}). Free variable(s): ${free.join(', ')}.`,
      tex: augTex(M, n),
    });
    return {
      steps,
      answerTex: '\\text{Infinitely many solutions}',
      answerNote: `Free variable(s): ${free.join(', ')}. The system is underdetermined.`,
    };
  }

  const sols = varNames.map((v, i) => {
    const r = pivotCols.indexOf(i);
    return { v, f: M[r][n], num: math.number(M[r][n]) };
  });

  steps.push({
    title: 'Read the Solution from Reduced Row-Echelon Form',
    desc: 'Each row gives the exact value of the corresponding variable.',
    tex: sols.map((s) => `${s.v} = ${texFrac(s.f)}`).join(', \\quad '),
  });

  const answerTex = sols.map((s) => `${s.v} = ${fmtVal(s.f, decimal)}`).join(', \\quad ');
  const note = decimal ? null : `Decimal: ${sols.map((s) => `${s.v} ≈ ${trimNum(s.num)}`).join(', ')}`;

  return { steps, answerTex, answerNote: note, solutions: sols };
}

/**
 * Solve a Linear System using Cramer's Rule
 */
function solveCramer(varNames, A, B, n, decimal) {
  const steps = [];

  if (A.length !== n) {
    steps.push({
      title: 'Cramer’s Rule Requirement Note',
      desc: `Cramer’s Rule is strictly defined for square systems (number of equations = number of unknowns, n × n). This system has ${A.length} equations and ${n} variables. Proceeding with standard Gauss-Jordan elimination instead.`,
      tex: '\\text{Square system required: } m = n',
    });
    return null;
  }

  // Step 1: Matrix Form AX = B
  const xVecTex = `\\begin{bmatrix} ${varNames.join(' \\\\ ')} \\end{bmatrix}`;
  const bVecTex = `\\begin{bmatrix} ${B.map((b) => texFrac(b)).join(' \\\\ ')} \\end{bmatrix}`;

  steps.push({
    title: 'Step 1: Write in Matrix Form AX = B',
    desc: 'State the system as the matrix equation AX = B.',
    tex: `${matTex(A)} ${xVecTex} = ${bVecTex}`,
  });

  // Step 2: Compute D = det(A)
  const D = detRec(A);
  let dStepDesc = '';
  let dStepTex = '';

  if (n === 2) {
    dStepDesc = 'Compute D = det(A) using the 2×2 determinant formula ad − bc:';
    dStepTex = `D = \\begin{vmatrix} ${A[0].map(texFrac).join(' & ')} \\\\ ${A[1].map(texFrac).join(' & ')} \\end{vmatrix} = ${det2TexStep(A)}`;
  } else if (n === 3) {
    dStepDesc = 'Compute D = det(A) using cofactor expansion along Row 1:';
    dStepTex = `D = \\begin{vmatrix} ${A.map((r) => r.map(texFrac).join(' & ')).join(' \\\\ ')} \\end{vmatrix} = ${det3TexStep(A)}`;
  } else {
    dStepDesc = 'Compute the determinant of coefficient matrix A:';
    dStepTex = `D = \\det(A) = ${texFrac(D)}`;
  }

  steps.push({
    title: 'Step 2: Calculate the Coefficient Determinant D',
    desc: dStepDesc,
    tex: dStepTex,
  });

  // Check if D is zero
  if (isZero(D)) {
    // Check D_i
    const subDets = varNames.map((v, col) => {
      const Ai = A.map((row, r) => row.map((val, c) => (c === col ? B[r] : val)));
      return { v, det: detRec(Ai) };
    });

    const anyNonZero = subDets.some((s) => !isZero(s.det));
    if (anyNonZero) {
      steps.push({
        title: 'Cramer’s Rule: Inconsistent System (No Solution)',
        desc: `Since D = 0 and at least one numerator determinant D_i ≠ 0, the lines/planes are parallel and have no intersection.`,
        tex: `D = 0, \\quad ${subDets.map((s) => `D_{${s.v}} = ${texFrac(s.det)}`).join(', ')} \\;\\implies\\; \\text{No Solution}`,
      });
      return { steps, answerTex: '\\text{No solution — inconsistent system.}' };
    } else {
      steps.push({
        title: 'Cramer’s Rule: Dependent System (Infinitely Many Solutions)',
        desc: 'Since D = 0 and all numerator determinants D_i = 0, the system has infinitely many solutions.',
        tex: `D = 0, \\quad ${subDets.map((s) => `D_{${s.v}} = 0`).join(', ')} \\;\\implies\\; \\text{Infinitely Many Solutions}`,
      });
      return { steps, answerTex: '\\text{Infinitely many solutions}' };
    }
  }

  // Step 3: Compute D_x, D_y, etc.
  const solutions = [];
  varNames.forEach((v, col) => {
    const Ai = A.map((row, r) => row.map((val, c) => (c === col ? B[r] : val)));
    const Di = detRec(Ai);

    let diTexStep = '';
    if (n === 2) {
      diTexStep = det2TexStep(Ai);
    } else if (n === 3) {
      diTexStep = det3TexStep(Ai);
    } else {
      diTexStep = texFrac(Di);
    }

    steps.push({
      title: `Step ${3 + col}: Calculate D_{${v}} (Replace column ${col + 1} with constants B)`,
      desc: `Substitute the constant vector B into column ${col + 1} of matrix A:`,
      tex: `A_{${v}} = ${matTex(Ai)}, \\qquad D_{${v}} = \\det(A_{${v}}) = ${diTexStep}`,
    });

    // Apply Cramer's formula
    const val = math.divide(Di, D);
    solutions.push({ v, f: val, num: math.number(val) });

    steps.push({
      title: `Apply Cramer’s formula for ${v}`,
      desc: `Divide D_{${v}} by D: \\(${v} = \\frac{D_{${v}}}{D}\\)`,
      tex: `${v} = \\frac{D_{${v}}}{D} = \\frac{${texFrac(Di)}}{${texFrac(D)}} = ${texFrac(val)}`,
    });
  });

  const answerTex = solutions.map((s) => `${s.v} = ${fmtVal(s.f, decimal)}`).join(', \\quad ');
  const note = decimal ? null : `Decimal: ${solutions.map((s) => `${s.v} ≈ ${trimNum(s.num)}`).join(', ')}`;

  steps.push({
    title: 'Summary Solution Vector',
    desc: 'The unique solution obtained via Cramer’s Rule is:',
    tex: `${xVecTex} = \\begin{bmatrix} ${solutions.map((s) => texFrac(s.f)).join(' \\\\ ')} \\end{bmatrix}`,
  });

  return { steps, answerTex, answerNote: note, solutions };
}

/**
 * Solve a Linear System using Matrix Inversion (X = A⁻¹ * B)
 */
function solveMatrixInversion(varNames, A, B, n, decimal) {
  const steps = [];

  if (A.length !== n) {
    return null; // non-square, handled by fallback
  }

  const xVecTex = `\\begin{bmatrix} ${varNames.join(' \\\\ ')} \\end{bmatrix}`;
  const bVecTex = `\\begin{bmatrix} ${B.map((b) => texFrac(b)).join(' \\\\ ')} \\end{bmatrix}`;

  steps.push({
    title: 'Step 1: Write in Matrix Form AX = B',
    desc: 'If det(A) ≠ 0, the unique solution is given by X = A⁻¹ · B.',
    tex: `${matTex(A)} ${xVecTex} = ${bVecTex}`,
  });

  const D = detRec(A);
  steps.push({
    title: 'Step 2: Check Invertibility via det(A)',
    desc: 'A matrix is invertible if and only if its determinant is non-zero.',
    tex: `\\det(A) = ${texFrac(D)} ${isZero(D) ? '= 0 \\;\\implies\\; \\text{Singular (Not Invertible)}' : '\\ne 0 \\;\\implies\\; \\text{Invertible}'}`,
  });

  if (isZero(D)) {
    steps.push({
      title: 'Matrix is Singular',
      desc: 'Since det(A) = 0, A⁻¹ does not exist. The system either has no solution or infinitely many solutions.',
      tex: '\\text{A is not invertible}',
    });
    return { steps, answerTex: '\\text{Cannot invert matrix (det = 0)}' };
  }

  let invA;
  if (n === 2) {
    const a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];
    invA = [
      [math.divide(d, D), math.divide(math.unaryMinus(b), D)],
      [math.divide(math.unaryMinus(c), D), math.divide(a, D)],
    ];

    steps.push({
      title: 'Step 3: Compute the 2×2 Inverse Matrix A⁻¹',
      desc: 'Swap diagonal elements, negate off-diagonal elements, and divide by det(A):',
      tex: `A^{-1} = \\frac{1}{${texFrac(D)}} \\begin{bmatrix} ${texFrac(d)} & -(${texFrac(b)}) \\\\ -(${texFrac(c)}) & ${texFrac(a)} \\end{bmatrix} = ${matTex(invA)}`,
    });
  } else {
    // Cofactors & Adjugate
    const C = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => {
        const sign = (r + c) % 2 === 0 ? 1 : -1;
        const subDet = detRec(minor(A, r, c));
        return math.multiply(sign, subDet);
      })
    );
    // Adjugate is transpose of C
    const Adj = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => C[c][r])
    );
    invA = Adj.map((row) => row.map((val) => math.divide(val, D)));

    steps.push({
      title: 'Step 3: Compute Inverse Matrix A⁻¹ using the Adjugate Formula',
      desc: 'A⁻¹ = (1 / det(A)) · adj(A), where adj(A) is the transpose of the cofactor matrix.',
      tex: `A^{-1} = \\frac{1}{${texFrac(D)}} ${matTex(Adj)} = ${matTex(invA)}`,
    });
  }

  // Step 4: Multiply X = A⁻¹ * B
  const X = Array.from({ length: n }, (_, r) => {
    let sum = math.fraction(0);
    for (let c = 0; c < n; c++) {
      sum = math.add(sum, math.multiply(invA[r][c], B[c]));
    }
    return sum;
  });

  const multStepsTex = Array.from({ length: n }, (_, r) => {
    const terms = Array.from({ length: n }, (_, c) => `(${texFrac(invA[r][c])})(${texFrac(B[c])})`).join(' + ');
    return `${varNames[r]} = ${terms} = ${texFrac(X[r])}`;
  }).join(' \\\\ ');

  steps.push({
    title: 'Step 4: Multiply X = A⁻¹ · B',
    desc: 'Compute the dot product of each row of A⁻¹ with the constant column vector B:',
    tex: `\\begin{aligned} ${multStepsTex} \\end{aligned}`,
  });

  const solutions = varNames.map((v, i) => ({ v, f: X[i], num: math.number(X[i]) }));
  const answerTex = solutions.map((s) => `${s.v} = ${fmtVal(s.f, decimal)}`).join(', \\quad ');
  const note = decimal ? null : `Decimal: ${solutions.map((s) => `${s.v} ≈ ${trimNum(s.num)}`).join(', ')}`;

  return { steps, answerTex, answerNote: note, solutions };
}

/**
 * Solve a Linear System using the Algebraic Substitution Method
 */
function solveSubstitutionLinear(varNames, A, B, n, decimal) {
  const steps = [];

  if (n > 4 || A.length !== n) {
    return null; // Fallback to Gauss-Jordan
  }

  steps.push({
    title: 'Step 1: Write System Equations',
    desc: 'Examine the system of linear equations:',
    tex: `\\begin{cases} ${A.map((row, i) => {
      const lhs = row.map((coef, c) => {
        if (isZero(coef)) return '';
        const num = math.number(coef);
        const sign = num < 0 ? '-' : '';
        const absVal = texFrac(math.abs(coef));
        const cTex = absVal === '1' ? '' : absVal;
        return `${sign}${cTex}${varNames[c]}`;
      }).filter(Boolean).join(' + ').replace(/\+\s*-/g, '- ');
      return `${lhs || '0'} = ${texFrac(B[i])}`;
    }).join(' \\\\ ')} \\end{cases}`,
  });

  // Find the variable with coefficient 1 or -1, or smallest abs
  let bestRow = 0, bestCol = 0, minScore = 999999;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isZero(A[r][c])) {
        const absVal = Math.abs(math.number(A[r][c]));
        const score = absVal === 1 ? 0 : absVal;
        if (score < minScore) {
          minScore = score;
          bestRow = r;
          bestCol = c;
        }
      }
    }
  }

  const isoVar = varNames[bestCol];
  const isoRow = A[bestRow];
  const isoPiv = isoRow[bestCol];

  // Isolated expression: isoVar = (B[bestRow] - sum(other * var)) / isoPiv
  const otherTerms = [];
  for (let c = 0; c < n; c++) {
    if (c !== bestCol && !isZero(isoRow[c])) {
      const movedCoeff = math.divide(math.unaryMinus(isoRow[c]), isoPiv);
      const sign = math.number(movedCoeff) < 0 ? '-' : '+';
      const absTex = texFrac(math.abs(movedCoeff));
      const cTex = absTex === '1' ? '' : absTex;
      otherTerms.push(`${sign} ${cTex}${varNames[c]}`);
    }
  }
  const constTerm = math.divide(B[bestRow], isoPiv);
  const constTex = texFrac(constTerm);
  const isoExprTex = `${constTex} ${otherTerms.join(' ')}`.trim().replace(/^\+\s*/, '');

  steps.push({
    title: `Step 2: Isolate ${isoVar} from Equation ${bestRow + 1}`,
    desc: `Solve Equation ${bestRow + 1} for ${isoVar} in terms of the other variables:`,
    tex: `${isoVar} = ${isoExprTex}`,
  });

  // For 2x2, substitution is straightforward and explicit
  if (n === 2) {
    const otherRowIdx = bestRow === 0 ? 1 : 0;
    const otherVarCol = bestCol === 0 ? 1 : 0;
    const otherVar = varNames[otherVarCol];

    const row2 = A[otherRowIdx];
    const b2 = B[otherRowIdx];

    steps.push({
      title: `Step 3: Substitute into Equation ${otherRowIdx + 1}`,
      desc: `Replace every instance of ${isoVar} with \\((${isoExprTex})\\):`,
      tex: `(${texFrac(row2[bestCol])})\\left(${isoExprTex}\\right) + (${texFrac(row2[otherVarCol])})${otherVar} = ${texFrac(b2)}`,
    });

    // Solve for otherVar
    // row2[bestCol] * constTerm + (row2[bestCol] * movedCoeff + row2[otherVarCol]) * otherVar = b2
    const coefOfOther = math.add(
      math.multiply(row2[bestCol], math.divide(math.unaryMinus(isoRow[otherVarCol]), isoPiv)),
      row2[otherVarCol]
    );
    const rhsVal = math.subtract(b2, math.multiply(row2[bestCol], constTerm));

    if (isZero(coefOfOther)) {
      if (isZero(rhsVal)) {
        return { steps, answerTex: '\\text{Infinitely many solutions}' };
      } else {
        return { steps, answerTex: '\\text{No solution — inconsistent system.}' };
      }
    }

    const solOther = math.divide(rhsVal, coefOfOther);
    steps.push({
      title: `Step 4: Solve for ${otherVar}`,
      desc: `Combine like terms and isolate ${otherVar}:`,
      tex: `(${texFrac(coefOfOther)})${otherVar} = ${texFrac(rhsVal)} \\;\\implies\\; ${otherVar} = ${texFrac(solOther)}`,
    });

    // Back-substitute to find isoVar
    const solIso = math.add(
      constTerm,
      math.multiply(math.divide(math.unaryMinus(isoRow[otherVarCol]), isoPiv), solOther)
    );

    steps.push({
      title: `Step 5: Back-substitute ${otherVar} to find ${isoVar}`,
      desc: `Substitute ${otherVar} = ${texFrac(solOther)} into the isolated expression \\(${isoVar} = ${isoExprTex}\\):`,
      tex: `${isoVar} = ${texFrac(solIso)}`,
    });

    const solutions = [
      { v: isoVar, f: solIso, num: math.number(solIso) },
      { v: otherVar, f: solOther, num: math.number(solOther) },
    ].sort((a, b) => varNames.indexOf(a.v) - varNames.indexOf(b.v));

    const answerTex = solutions.map((s) => `${s.v} = ${fmtVal(s.f, decimal)}`).join(', \\quad ');
    const note = decimal ? null : `Decimal: ${solutions.map((s) => `${s.v} ≈ ${trimNum(s.num)}`).join(', ')}`;

    return { steps, answerTex, answerNote: note, solutions };
  }

  // If n >= 3, combine with Gauss-Jordan after substitution overview
  const gj = solveGaussJordan(varNames, A.map((r, i) => [...r, B[i]]), n, decimal);
  return {
    steps: [...steps, ...gj.steps.slice(1)],
    answerTex: gj.answerTex,
    answerNote: gj.answerNote,
    solutions: gj.solutions,
  };
}

/**
 * Solve a Non-linear System of Equations (2 variables, e.g. x and y)
 */
function solveNonLinearSystem(varNames, eqStrings, decimal) {
  const steps = [];
  const v1 = varNames[0] || 'x';
  const v2 = varNames[1] || 'y';

  steps.push({
    title: 'Identify Non-Linear System',
    desc: 'The system contains non-linear terms (such as quadratic powers, conic equations, or products). We solve using algebraic substitution and elimination.',
    tex: `\\begin{cases} ${eqStrings.map((e) => texExpr(e)).join(' \\\\ ')} \\end{cases}`,
  });

  // Parse each equation as LHS - RHS = 0
  const eqs = eqStrings.map((eqRaw) => {
    const s = preprocess(eqRaw);
    const [L, R] = s.split('=');
    return {
      raw: eqRaw,
      L: L.trim(),
      R: R.trim(),
      diff: `(${L.trim()}) - (${R.trim()})`,
    };
  });

  // Helper to test if an equation is linear in a target variable
  const checkLinearInVar = (diffStr, targetVar, otherVar) => {
    try {
      const comp = math.compile(diffStr);
      const testVals = [-2, 0, 3];
      for (const t of testVals) {
        const v0 = comp.evaluate({ [targetVar]: 0, [otherVar]: t });
        const v1 = comp.evaluate({ [targetVar]: 1, [otherVar]: t });
        const v2 = comp.evaluate({ [targetVar]: 2, [otherVar]: t });
        if (Math.abs((v2 - v0) - 2 * (v1 - v0)) > 1e-6) return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Check if both equations are symmetric conics in x^2 and y^2 (e.g. x^2 + y^2 = 25 and x^2 - y^2 = 7)
  const isConicInSquares = (diffStr) => {
    try {
      const comp = math.compile(diffStr);
      // odd symmetry check: f(x, y) === f(-x, -y) === f(x, -y)
      const p1 = comp.evaluate({ [v1]: 2, [v2]: 3 });
      const p2 = comp.evaluate({ [v1]: -2, [v2]: 3 });
      const p3 = comp.evaluate({ [v1]: 2, [v2]: -3 });
      return Math.abs(p1 - p2) < 1e-6 && Math.abs(p1 - p3) < 1e-6;
    } catch {
      return false;
    }
  };

  // Case 1: Both equations are conics in squares (u = x^2, v = y^2)
  if (eqs.length === 2 && isConicInSquares(eqs[0].diff) && isConicInSquares(eqs[1].diff)) {
    steps.push({
      title: 'Substitute u = x² and v = y²',
      desc: 'Since all variable terms appear only as even squares x² and y², transform the system into a linear system in u and v.',
      tex: `u = ${v1}^2, \\quad v = ${v2}^2`,
    });

    try {
      // Evaluate linear coefficients in u and v
      const comp1 = math.compile(eqs[0].diff);
      const comp2 = math.compile(eqs[1].diff);

      const c1_0 = comp1.evaluate({ [v1]: 0, [v2]: 0 });
      const a1 = comp1.evaluate({ [v1]: 1, [v2]: 0 }) - c1_0;
      const b1 = comp1.evaluate({ [v1]: 0, [v2]: 1 }) - c1_0;

      const c2_0 = comp2.evaluate({ [v1]: 0, [v2]: 0 });
      const a2 = comp2.evaluate({ [v1]: 1, [v2]: 0 }) - c2_0;
      const b2 = comp2.evaluate({ [v1]: 0, [v2]: 1 }) - c2_0;

      const linRes = solveGaussJordan(
        ['u', 'v'],
        [
          [approxFrac(a1), approxFrac(b1), approxFrac(-c1_0)],
          [approxFrac(a2), approxFrac(b2), approxFrac(-c2_0)],
        ],
        2,
        false
      );

      if (linRes && linRes.solutions && linRes.solutions.length === 2) {
        const uVal = linRes.solutions[0].num;
        const vVal = linRes.solutions[1].num;

        steps.push({
          title: 'Solve for u and v',
          desc: 'Solving the linear system in u and v yields:',
          tex: `u = ${texFrac(approxFrac(uVal))}, \\qquad v = ${texFrac(approxFrac(vVal))}`,
        });

        if (uVal >= 0 && vVal >= 0) {
          const sqrtU = Math.sqrt(uVal);
          const sqrtV = Math.sqrt(vVal);
          const fU = approxFrac(sqrtU);
          const fV = approxFrac(sqrtV);
          const sU = fU ? texFrac(fU) : trimNum(sqrtU);
          const sV = fV ? texFrac(fV) : trimNum(sqrtV);

          steps.push({
            title: `Take Square Roots for ${v1} and ${v2}`,
            desc: `Since ${v1} = ±√u and ${v2} = ±√v, we obtain four intersection points:`,
            tex: `${v1} = \\pm ${sU}, \\qquad ${v2} = \\pm ${sV}`,
          });

          const answers = [
            { tex: `(${sU}, ${sV})`, num: sqrtU, pairNum: sqrtV },
            { tex: `(${sU}, -${sV})`, num: sqrtU, pairNum: -sqrtV },
            { tex: `(-${sU}, ${sV})`, num: -sqrtU, pairNum: sqrtV },
            { tex: `(-${sU}, -${sV})`, num: -sqrtU, pairNum: -sqrtV },
          ];

          const answerTex = `(${v1}, ${v2}) \\in \\left\\{ ${answers.map((a) => a.tex).join(', ')} \\right\\}`;
          return {
            steps,
            answerTex,
            answers,
            plottableSystem: { eq1: eqs[0].raw, eq2: eqs[1].raw, vars: [v1, v2] },
          };
        }
      }
    } catch {
      // Fall through to general substitution
    }
  }

  // Case 2: General Substitution Method
  // Check if either equation is linear in v2 (or v1)
  let isoEqIdx = -1;
  let isoVarName = '';
  let otherVarName = '';

  for (let i = 0; i < eqs.length; i++) {
    if (checkLinearInVar(eqs[i].diff, v2, v1)) {
      isoEqIdx = i;
      isoVarName = v2;
      otherVarName = v1;
      break;
    }
    if (checkLinearInVar(eqs[i].diff, v1, v2)) {
      isoEqIdx = i;
      isoVarName = v1;
      otherVarName = v2;
      break;
    }
  }

  if (isoEqIdx !== -1) {
    const chosenEq = eqs[isoEqIdx];
    const targetEq = eqs[1 - isoEqIdx];

    // Compute isolated expression for isoVarName:
    // chosenEq.diff = A(otherVar) * isoVar + B(otherVar) = 0 => isoVar = -B(otherVar) / A(otherVar)
    const comp = math.compile(chosenEq.diff);
    // Determine symbolic isolation
    let isoExprStr = '';
    let isoTex = '';

    // Check common patterns: y = x^2 - 4 or x - y = 1 or y = 2x + 1
    if (chosenEq.L === isoVarName) {
      isoExprStr = chosenEq.R;
      isoTex = texExpr(chosenEq.R);
    } else if (chosenEq.R === isoVarName) {
      isoExprStr = chosenEq.L;
      isoTex = texExpr(chosenEq.L);
    } else {
      // Numerical sample to check leading coefficient of isoVar
      const b0 = comp.evaluate({ [isoVarName]: 0, [otherVarName]: 0 });
      const a0 = comp.evaluate({ [isoVarName]: 1, [otherVarName]: 0 }) - b0;
      if (Math.abs(a0 - (-1)) < 1e-6) {
        // e.g. x - y = 1 => -y + x - 1 = 0 => y = x - 1
        isoExprStr = `(${chosenEq.L}) - (${chosenEq.R}) + ${isoVarName}`;
        try {
          const simp = math.simplify(isoExprStr);
          isoExprStr = simp.toString();
          isoTex = simp.toTex();
        } catch {
          isoTex = texExpr(isoExprStr);
        }
      } else {
        isoExprStr = `((${chosenEq.R}) - (${chosenEq.L}) + (${a0})*${isoVarName}) / (${a0})`;
        try {
          const simp = math.simplify(isoExprStr);
          isoExprStr = simp.toString();
          isoTex = simp.toTex();
        } catch {
          isoTex = texExpr(isoExprStr);
        }
      }
    }

    steps.push({
      title: `Step 1: Isolate ${isoVarName} in Equation ${isoEqIdx + 1}`,
      desc: `From Equation ${isoEqIdx + 1} (${chosenEq.raw}), express ${isoVarName} in terms of ${otherVarName}:`,
      tex: `${isoVarName} = ${isoTex}`,
    });

    // Substitute into targetEq: targetEq.diff with isoVar replaced by (isoExprStr)
    const subTargetExpr = targetEq.diff.replace(
      new RegExp(`\\b${isoVarName}\\b`, 'g'),
      `(${isoExprStr})`
    );

    steps.push({
      title: `Step 2: Substitute ${isoVarName} into Equation ${2 - isoEqIdx}`,
      desc: `Substitute \\(${isoVarName} = ${isoTex}\\) into ${targetEq.raw}:`,
      tex: `${texExpr(targetEq.L.replace(new RegExp(`\\b${isoVarName}\\b`, 'g'), `(${isoExprStr})`))} = ${texExpr(targetEq.R.replace(new RegExp(`\\b${isoVarName}\\b`, 'g'), `(${isoExprStr})`))}`,
    });

    try {
      const { coeffs } = polyCoeffsFromExpr(subTargetExpr, otherVarName);
      const ints = coeffs.map((c) => math.number(c));

      steps.push({
        title: `Step 3: Expand and Simplify into a Polynomial Equation in ${otherVarName}`,
        desc: `Collect all terms on one side in standard descending order:`,
        tex: `${polyTexFromFracs(coeffs, otherVarName)} = 0`,
      });

      const polyRes = solvePolynomial(ints, otherVarName, decimal);
      steps.push(...polyRes.steps.slice(1));

      // For each real root found, compute corresponding isoVarName
      const isoComp = math.compile(isoExprStr);
      const candidateSols = [];

      polyRes.answers.forEach((ans) => {
        if (typeof ans.num === 'number') {
          const oVal = ans.num;
          try {
            const iVal = isoComp.evaluate({ [otherVarName]: oVal });
            // Verify both in original equations
            const check1 = comp.evaluate({ [isoVarName]: iVal, [otherVarName]: oVal });
            const compTarget = math.compile(targetEq.diff);
            const check2 = compTarget.evaluate({ [isoVarName]: iVal, [otherVarName]: oVal });

            if (Math.abs(check1) < 1e-4 && Math.abs(check2) < 1e-4) {
              const xVal = otherVarName === v1 ? oVal : iVal;
              const yVal = otherVarName === v1 ? iVal : oVal;
              const xFrac = approxFrac(xVal);
              const yFrac = approxFrac(yVal);
              const xTex = xFrac ? texFrac(xFrac) : trimNum(xVal);
              const yTex = yFrac ? texFrac(yFrac) : trimNum(yVal);

              candidateSols.push({
                x: xVal,
                y: yVal,
                tex: `(${xTex}, ${yTex})`,
              });
            }
          } catch {
            // ignore domain error
          }
        }
      });

      if (candidateSols.length > 0) {
        steps.push({
          title: 'Step 4: Back-substitute to find Corresponding Coordinates',
          desc: `Substitute each root for ${otherVarName} back into \\(${isoVarName} = ${isoTex}\\) to find the paired values:`,
          tex: candidateSols.map((s) => `(${v1}, ${v2}) = ${s.tex}`).join(', \\quad '),
        });

        const answerTex = `(${v1}, ${v2}) \\in \\left\\{ ${candidateSols.map((s) => s.tex).join(', ')} \\right\\}`;
        return {
          steps,
          answerTex,
          answers: candidateSols.map((s) => ({ tex: s.tex, num: s.x, pairNum: s.y })),
          plottableSystem: { eq1: eqs[0].raw, eq2: eqs[1].raw, vars: [v1, v2] },
        };
      }
    } catch {
      // Fall through to general numeric solver
    }
  }

  // Case 3: Numerical grid & refinement for general non-linear systems
  try {
    const comp1 = math.compile(eqs[0].diff);
    const comp2 = math.compile(eqs[1].diff);
    const foundPoints = [];

    // Scan window [-15, 15] x [-15, 15]
    for (let gx = -12; gx <= 12; gx += 0.5) {
      for (let gy = -12; gy <= 12; gy += 0.5) {
        let x = gx, y = gy;
        let converged = false;
        for (let iter = 0; iter < 15; iter++) {
          const f1 = comp1.evaluate({ [v1]: x, [v2]: y });
          const f2 = comp2.evaluate({ [v1]: x, [v2]: y });
          if (Math.abs(f1) < 1e-8 && Math.abs(f2) < 1e-8) {
            converged = true;
            break;
          }
          const h = 1e-5;
          const df1_dx = (comp1.evaluate({ [v1]: x + h, [v2]: y }) - f1) / h;
          const df1_dy = (comp1.evaluate({ [v1]: x, [v2]: y + h }) - f1) / h;
          const df2_dx = (comp2.evaluate({ [v1]: x + h, [v2]: y }) - f2) / h;
          const df2_dy = (comp2.evaluate({ [v1]: x, [v2]: y + h }) - f2) / h;
          const detJ = df1_dx * df2_dy - df1_dy * df2_dx;
          if (Math.abs(detJ) < 1e-9) break;

          const dx = (f1 * df2_dy - f2 * df1_dy) / detJ;
          const dy = (df1_dx * f2 - df2_dx * f1) / detJ;
          x -= dx;
          y -= dy;
          if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
            converged = true;
            break;
          }
        }
        if (converged && Math.abs(x) < 50 && Math.abs(y) < 50) {
          const rx = Math.round(x * 10000) / 10000;
          const ry = Math.round(y * 10000) / 10000;
          if (!foundPoints.some((p) => Math.abs(p.x - rx) < 1e-3 && Math.abs(p.y - ry) < 1e-3)) {
            foundPoints.push({ x: rx, y: ry });
          }
        }
      }
    }

    if (foundPoints.length > 0) {
      const answers = foundPoints.map((p) => {
        const fx = approxFrac(p.x);
        const fy = approxFrac(p.y);
        const sX = fx ? texFrac(fx) : trimNum(p.x);
        const sY = fy ? texFrac(fy) : trimNum(p.y);
        return { tex: `(${sX}, ${sY})`, num: p.x, pairNum: p.y };
      });

      steps.push({
        title: 'Non-Linear Intersection Solutions',
        desc: 'Simultaneous intersection coordinates satisfying both equations:',
        tex: answers.map((a) => `(${v1}, ${v2}) = ${a.tex}`).join(', \\quad '),
      });

      const answerTex = `(${v1}, ${v2}) \\in \\left\\{ ${answers.map((a) => a.tex).join(', ')} \\right\\}`;
      return {
        steps,
        answerTex,
        answers,
        plottableSystem: { eq1: eqs[0].raw, eq2: eqs[1].raw, vars: [v1, v2] },
      };
    }
  } catch {
    // Numeric error
  }

  return {
    steps,
    answerTex: '\\text{No real intersection solutions found in standard range.}',
    plottableSystem: { eq1: eqs[0].raw, eq2: eqs[1].raw, vars: [v1, v2] },
  };
}

/**
 * Main System of Equations Solver with method selector
 * Supported methods: 'gauss-jordan', 'cramer', 'substitution', 'matrix-inversion'
 */
export function solveSystem(varNamesRaw, eqStringsRaw, opts = {}) {
  const decimal = !!opts.decimal;
  const method = opts.method || 'gauss-jordan';

  try {
    const varNames = String(varNamesRaw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!varNames.length) return { error: 'Enter at least one variable name, e.g. "x, y".' };
    if (varNames.length > 6) return { error: 'Up to 6 variables are supported.' };

    const eqStrings = eqStringsRaw.map((e) => String(e).trim()).filter(Boolean);
    if (!eqStrings.length) return { error: 'Enter at least one equation.' };

    const n = varNames.length;

    // Check if system is non-linear
    const linearity = analyzeSystemLinearity(varNames, eqStrings);
    if (linearity.error) return { error: linearity.error };

    if (!linearity.isLinear) {
      // Non-linear system solver
      return solveNonLinearSystem(varNames, eqStrings, decimal);
    }

    // It's a linear system: extract matrix A and vector B
    const A = [];
    const B = [];
    const M = [];

    for (const eqRaw of eqStrings) {
      const s = preprocess(eqRaw);
      const parts = s.split('=');
      if (parts.length !== 2) return { error: `Each equation needs exactly one "=" sign: "${eqRaw}"` };
      const expr = `(${parts[0]}) - (${parts[1]})`;
      const compiled = math.compile(expr);
      const scope0 = Object.fromEntries(varNames.map((v) => [v, 0]));
      const c0 = compiled.evaluate(scope0);

      const row = [];
      for (const v of varNames) {
        const coef = compiled.evaluate({ ...scope0, [v]: 1 }) - c0;
        const f = approxFrac(coef);
        if (!f) throw new Error(`Could not compute exact fraction for coefficient of ${v}.`);
        row.push(f);
      }
      const rhs = approxFrac(-c0);
      if (!rhs) throw new Error('Could not compute exact fraction for constant term.');

      A.push(row);
      B.push(rhs);
      M.push([...row, rhs]);
    }

    let result;
    if (method === 'cramer') {
      result = solveCramer(varNames, A, B, n, decimal);
      if (!result) {
        // Non-square system, fell back
        result = solveGaussJordan(varNames, M, n, decimal);
      }
    } else if (method === 'matrix-inversion') {
      result = solveMatrixInversion(varNames, A, B, n, decimal);
      if (!result) {
        result = solveGaussJordan(varNames, M, n, decimal);
      }
    } else if (method === 'substitution') {
      result = solveSubstitutionLinear(varNames, A, B, n, decimal);
      if (!result) {
        result = solveGaussJordan(varNames, M, n, decimal);
      }
    } else {
      // Default: 'gauss-jordan'
      result = solveGaussJordan(varNames, M, n, decimal);
    }

    // Attach plottable data if 2 variables and 2 equations
    if (n === 2 && eqStrings.length >= 2) {
      result.plottableSystem = {
        eq1: eqStrings[0],
        eq2: eqStrings[1],
        vars: varNames,
      };
    }

    return result;
  } catch (err) {
    return { error: `Could not solve system: ${err.message}` };
  }
}
