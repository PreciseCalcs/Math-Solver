// Inequality Solver with sign flipping rules, interval testing, and interval notation
import {
  math, approxFrac, texFrac, trimNum, fmtVal, texExpr,
} from './utils.js';
import { parseLinearCoeffs, formatLinearSide } from './linearSolver.js';
import { parseQuadraticCoeffs } from './quadraticSolver.js';

// Reverse inequality operator: '<' -> '>', '<=' -> '>='
function flipOp(op) {
  if (op === '<') return '>';
  if (op === '<=') return '>=';
  if (op === '>') return '<';
  if (op === '>=') return '<=';
  return op;
}

// Convert op to LaTeX
function texOp(op) {
  if (op === '<=') return '\\le';
  if (op === '>=') return '\\ge';
  return op;
}

export function solveInequality(L, R, op, v, decimal = false) {
  const steps = [];
  const origTex = `${texExpr(L)} ${texOp(op)} ${texExpr(R)}`;
  steps.push({
    title: 'Original inequality',
    desc: 'Solve the inequality for the unknown variable and determine the solution set.',
    tex: origTex,
  });

  // Check if both sides are linear
  const pL = parseLinearCoeffs(L, v);
  const pR = parseLinearCoeffs(R, v);

  if (pL && pR) {
    let curL = L;
    let curR = R;
    let curOp = op;

    let leftC = pL.coeff;
    let leftK = pL.constant;
    let rightC = pR.coeff;
    let rightK = pR.constant;

    // Combine like terms representation
    const sideLTex = formatLinearSide(leftC, leftK, v);
    const sideRTex = formatLinearSide(rightC, rightK, v);
    if (`${sideLTex} ${texOp(curOp)} ${sideRTex}` !== origTex) {
      steps.push({
        title: 'Combine like terms',
        desc: 'Simplify both sides of the inequality.',
        tex: `${sideLTex} ${texOp(curOp)} ${sideRTex}`,
      });
    }

    // Move variable terms to left side
    if (math.number(rightC) !== 0) {
      const newLeftC = math.subtract(leftC, rightC);
      const signWord = math.number(rightC) > 0 ? 'Subtract' : 'Add';
      const valTex = math.number(math.abs(rightC)) === 1 ? v : `${texFrac(math.abs(rightC))}${v}`;

      steps.push({
        title: 'Move variable terms to the left side',
        desc: `${signWord} ${valTex} from both sides.`,
        tex: `${formatLinearSide(newLeftC, leftK, v)} ${texOp(curOp)} ${texFrac(rightK)}`,
      });

      leftC = newLeftC;
      rightC = math.fraction(0);
    }

    // Move constant terms to right side
    if (math.number(leftK) !== 0) {
      const newRightK = math.subtract(rightK, leftK);
      const signWord = math.number(leftK) > 0 ? 'Subtract' : 'Add';
      const valTex = texFrac(math.abs(leftK));

      steps.push({
        title: 'Move constant terms to the right side',
        desc: `${signWord} ${valTex} from both sides.`,
        tex: `${formatLinearSide(leftC, math.fraction(0), v)} ${texOp(curOp)} ${texFrac(newRightK)}`,
      });

      leftK = math.fraction(0);
      rightK = newRightK;
    }

    const aNum = math.number(leftC);
    const bNum = math.number(rightK);

    // If a === 0
    if (aNum === 0) {
      let isTrue = false;
      if (curOp === '<') isTrue = 0 < bNum;
      else if (curOp === '<=') isTrue = 0 <= bNum;
      else if (curOp === '>') isTrue = 0 > bNum;
      else if (curOp === '>=') isTrue = 0 >= bNum;

      if (isTrue) {
        steps.push({
          title: 'Identity (True for all real numbers)',
          desc: `The inequality simplifies to 0 ${texOp(curOp)} ${bNum}, which is always true.`,
          tex: `x \\in (-\\infty, \\infty)`,
        });
        return {
          steps,
          answerTex: `${v} \\in (-\\infty, \\infty) \\quad \\text{(All real numbers)}`,
          answerNote: 'The inequality holds true for all real values.',
        };
      } else {
        steps.push({
          title: 'Contradiction (No solution)',
          desc: `The inequality simplifies to 0 ${texOp(curOp)} ${bNum}, which is false.`,
          tex: '\\emptyset',
        });
        return {
          steps,
          answerTex: '\\text{No solution } (\\emptyset)',
          answerNote: 'No real number satisfies this inequality.',
        };
      }
    }

    // Divide by aNum
    const rootFrac = math.divide(rightK, leftC);
    const rootNum = math.number(rootFrac);

    if (aNum < 0) {
      curOp = flipOp(curOp);
      steps.push({
        title: 'Divide by negative coefficient (REVERSE INEQUALITY SIGN)',
        desc: `IMPORTANT RULE: Dividing or multiplying both sides by a negative number (${texFrac(leftC)}) REVERSES the inequality symbol (${texOp(flipOp(curOp))} becomes ${texOp(curOp)}).`,
        tex: `${v} ${texOp(curOp)} \\frac{${texFrac(rightK)}}{${texFrac(leftC)}} = ${texFrac(rootFrac)}`,
      });
    } else if (aNum !== 1) {
      steps.push({
        title: 'Divide both sides by the positive coefficient',
        desc: `Divide both sides by ${texFrac(leftC)}. Since it is positive, the inequality sign remains unchanged.`,
        tex: `${v} ${texOp(curOp)} \\frac{${texFrac(rightK)}}{${texFrac(leftC)}} = ${texFrac(rootFrac)}`,
      });
    }

    // Interval notation
    let intervalTex = '';
    const valTex = texFrac(rootFrac);
    if (curOp === '<') intervalTex = `(-\\infty, ${valTex})`;
    else if (curOp === '<=') intervalTex = `(-\\infty, ${valTex}]`;
    else if (curOp === '>') intervalTex = `(${valTex}, \\infty)`;
    else if (curOp === '>=') intervalTex = `[${valTex}, \\infty)`;

    steps.push({
      title: 'Solution in interval notation',
      desc: 'Express the continuous range of solutions in standard mathematical interval format.',
      tex: `${v} \\in ${intervalTex}`,
    });

    const finalAns = `${v} ${texOp(curOp)} ${valTex} \\quad \\iff \\quad ${v} \\in ${intervalTex}`;
    return {
      steps,
      answerTex: finalAns,
      answerNote: null,
      answers: [{ tex: finalAns, num: rootNum }],
    };
  }

  // Check Quadratic Inequality: P(x) op 0
  const diffStr = `(${L}) - (${R})`;
  const quadCoeffs = parseQuadraticCoeffs(diffStr, v);

  if (quadCoeffs) {
    let { a, b, c } = quadCoeffs;
    const D = b * b - 4 * a * c;

    steps.push({
      title: 'Move all terms to one side',
      desc: 'Rearrange the inequality so that it is compared against zero.',
      tex: `${texExpr(diffStr)} ${texOp(op)} 0`,
    });

    if (D < 0) {
      // Parabola does not cross x-axis
      const signA = a > 0 ? 1 : -1;
      let satisfies = false;
      if (op === '>' || op === '>=') satisfies = signA > 0;
      else satisfies = signA < 0;

      if (satisfies) {
        steps.push({
          title: 'Discriminant is negative (Δ < 0)',
          desc: `The quadratic has no real roots and opens ${a > 0 ? 'upward' : 'downward'}, remaining entirely ${a > 0 ? 'positive' : 'negative'} for all x.`,
          tex: `${v} \\in (-\\infty, \\infty)`,
        });
        return {
          steps,
          answerTex: `${v} \\in (-\\infty, \\infty) \\quad \\text{(All real numbers)}`,
          answerNote: null,
        };
      } else {
        steps.push({
          title: 'Discriminant is negative (Δ < 0)',
          desc: 'The parabola never enters the required region. No real number satisfies the inequality.',
          tex: '\\emptyset',
        });
        return {
          steps,
          answerTex: '\\text{No solution } (\\emptyset)',
          answerNote: null,
        };
      }
    }

    // Two roots
    const r1 = (-b - Math.sqrt(D)) / (2 * a);
    const r2 = (-b + Math.sqrt(D)) / (2 * a);
    const smaller = Math.min(r1, r2);
    const larger = Math.max(r1, r2);

    const f1 = approxFrac(smaller, 1000, 1e-6) || math.fraction(smaller);
    const f2 = approxFrac(larger, 1000, 1e-6) || math.fraction(larger);
    const sTex = texFrac(f1);
    const lTex = texFrac(f2);

    steps.push({
      title: 'Find boundary critical values',
      desc: 'Set the quadratic equal to zero and solve for the boundary points.',
      tex: `${v}_1 = ${sTex}, \\quad ${v}_2 = ${lTex}`,
    });

    steps.push({
      title: 'Test sign intervals',
      desc: `The boundary roots divide the real number line into three intervals: (-∞, ${sTex}), (${sTex}, ${lTex}), and (${lTex}, ∞).`,
      tex: `(-\\infty, ${sTex}), \\quad (${sTex}, ${lTex}), \\quad (${lTex}, \\infty)`,
    });

    const isBetween = (a > 0 && (op === '<' || op === '<=')) || (a < 0 && (op === '>' || op === '>='));
    const inclusive = op === '<=' || op === '>=';

    let intervalTex = '';
    let ineqTex = '';
    if (isBetween) {
      intervalTex = inclusive ? `[${sTex}, ${lTex}]` : `(${sTex}, ${lTex})`;
      ineqTex = inclusive ? `${sTex} \\le ${v} \\le ${lTex}` : `${sTex} < ${v} < ${lTex}`;
    } else {
      intervalTex = inclusive
        ? `(-\\infty, ${sTex}] \\cup [${lTex}, \\infty)`
        : `(-\\infty, ${sTex}) \\cup (${lTex}, \\infty)`;
      ineqTex = inclusive
        ? `${v} \\le ${sTex} \\quad\\text{or}\\quad ${v} \\ge ${lTex}`
        : `${v} < ${sTex} \\quad\\text{or}\\quad ${v} > ${lTex}`;
    }

    steps.push({
      title: 'Solution in interval notation',
      desc: `Determine which intervals satisfy the inequality condition (${texOp(op)} 0).`,
      tex: `${v} \\in ${intervalTex}`,
    });

    const finalAns = `${ineqTex} \\quad \\iff \\quad ${v} \\in ${intervalTex}`;
    return {
      steps,
      answerTex: finalAns,
      answerNote: null,
      answers: [{ tex: finalAns, num: NaN }],
    };
  }

  return null;
}
