// Polynomial Operations Engine: Long Division, Synthetic Division, Multiplication/FOIL, and Expansion
import {
  math, approxFrac, texFrac, fmtVal, trimNum, preprocess,
} from './utils.js';
import { polyCoeffsFromExpr, polyTexFromFracs } from './poly.js';

const F = (x) => math.fraction(x);
const isZero = (f) => math.number(f) === 0;

/**
 * Helper to convert ascending Fraction array to descending Fraction array
 */
function toDescFracs(ascFracs) {
  return [...ascFracs].reverse();
}

/**
 * Format descending fraction coefficient array to clean LaTeX polynomial
 */
export function polyTexDesc(descFracs, v = 'x') {
  const asc = [...descFracs].reverse();
  return polyTexFromFracs(asc, v);
}

/**
 * Parse an expression into descending fraction coefficients and variable name
 */
export function parsePolyDesc(exprStr, v = 'x') {
  const s = preprocess(exprStr);
  const { coeffs } = polyCoeffsFromExpr(s, v);
  const desc = toDescFracs(coeffs);
  // Trim leading zeros
  while (desc.length > 1 && isZero(desc[0])) {
    desc.shift();
  }
  return desc;
}

/**
 * Multiply two descending polynomial coefficient arrays
 */
export function multiplyPolyDesc(P, Q) {
  const degP = P.length - 1;
  const degQ = Q.length - 1;
  const degRes = degP + degQ;
  const res = Array.from({ length: degRes + 1 }, () => math.fraction(0));

  for (let i = 0; i <= degP; i++) {
    for (let j = 0; j <= degQ; j++) {
      const prod = math.multiply(P[i], Q[j]);
      res[i + j] = math.add(res[i + j], prod);
    }
  }
  return res;
}

/**
 * Perform Polynomial Long Division: P(x) / D(x) = Q(x) + R(x)/D(x)
 */
export function solvePolyLongDivision(dividendRaw, divisorRaw, opts = {}) {
  const v = opts.variable || 'x';
  const decimal = !!opts.decimal;

  try {
    const P = parsePolyDesc(dividendRaw, v);
    const D = parsePolyDesc(divisorRaw, v);

    if (D.length === 1 && isZero(D[0])) {
      return { error: 'Cannot divide by zero polynomial D(x) = 0.' };
    }

    const steps = [];
    const pTex = polyTexDesc(P, v);
    const dTex = polyTexDesc(D, v);

    steps.push({
      title: 'Identify Dividend and Divisor',
      desc: 'Set up the polynomial division problem in standard descending order.',
      tex: `\\frac{P(${v})}{D(${v})} = \\frac{${pTex}}{${dTex}}`,
    });

    const degP = P.length - 1;
    const degD = D.length - 1;

    // Special case: degree of dividend < degree of divisor
    if (degP < degD) {
      steps.push({
        title: 'Degree of Dividend is less than Divisor',
        desc: `Since the degree of P(${v}) (${degP}) is less than the degree of D(${v}) (${degD}), the quotient is 0 and the remainder is the dividend itself.`,
        tex: `Q(${v}) = 0, \\qquad R(${v}) = ${pTex}`,
      });
      return {
        steps,
        quotientTex: '0',
        remainderTex: pTex,
        answerTex: `\\frac{${pTex}}{${dTex}} = 0 + \\frac{${pTex}}{${dTex}}`,
        quotient: [math.fraction(0)],
        remainder: P,
      };
    }

    // Long division algorithm
    let curRemainder = [...P];
    const quotientTerms = [];
    const tableauRows = [];

    let cycle = 1;
    while (curRemainder.length >= D.length) {
      // Clean leading zeros from current remainder
      while (curRemainder.length > 0 && isZero(curRemainder[0])) {
        curRemainder.shift();
      }
      if (curRemainder.length < D.length) break;

      const curDegP = curRemainder.length - 1;
      const termDeg = curDegP - degD;
      const termCoeff = math.divide(curRemainder[0], D[0]);

      quotientTerms.push({ deg: termDeg, coeff: termCoeff });

      // Compute subtraction polynomial: term * D
      const subPoly = Array.from({ length: curRemainder.length }, () => math.fraction(0));
      for (let j = 0; j < D.length; j++) {
        subPoly[j] = math.multiply(termCoeff, D[j]);
      }

      const qTermTex = polyTexDesc(
        Array.from({ length: termDeg + 1 }, (_, i) => (i === 0 ? termCoeff : math.fraction(0))),
        v
      );
      const curRemTex = polyTexDesc(curRemainder, v);
      const subPolyTex = polyTexDesc(subPoly, v);

      // Perform subtraction: curRemainder - subPoly
      const nextRemainder = [];
      for (let i = 0; i < curRemainder.length; i++) {
        nextRemainder.push(math.subtract(curRemainder[i], subPoly[i]));
      }

      // Drop the leading zero
      nextRemainder.shift();
      while (nextRemainder.length > 1 && isZero(nextRemainder[0])) {
        nextRemainder.shift();
      }

      const nextRemTex = polyTexDesc(nextRemainder.length ? nextRemainder : [math.fraction(0)], v);

      steps.push({
        title: `Step ${cycle}: Divide leading terms`,
        desc: `Divide the leading term of the current remainder by the leading term of the divisor: \\(${texFrac(curRemainder[0])}${curDegP === 0 ? '' : curDegP === 1 ? v : `${v}^{${curDegP}}`} \\div ${texFrac(D[0])}${degD === 0 ? '' : degD === 1 ? v : `${v}^{${degD}}`} = ${qTermTex}\\). Multiply by the divisor and subtract.`,
        tex: `\\begin{aligned} \\text{Multiply: } & (${qTermTex}) \\cdot (${dTex}) = ${subPolyTex} \\\\[4pt] \\text{Subtract: } & (${curRemTex}) - (${subPolyTex}) = ${nextRemTex} \\end{aligned}`,
      });

      tableauRows.push({
        qTermTex,
        curRemTex,
        subPolyTex,
        nextRemTex,
      });

      curRemainder = nextRemainder;
      cycle++;
    }

    // Build final quotient polynomial
    const finalQuotientDeg = degP - degD;
    const quotientCoeffs = Array.from({ length: finalQuotientDeg + 1 }, () => math.fraction(0));
    quotientTerms.forEach(({ deg, coeff }) => {
      const idx = finalQuotientDeg - deg;
      if (idx >= 0 && idx < quotientCoeffs.length) {
        quotientCoeffs[idx] = coeff;
      }
    });

    const finalQuotientTex = polyTexDesc(quotientCoeffs, v);
    const finalRemainder = curRemainder.length ? curRemainder : [math.fraction(0)];
    const finalRemainderTex = polyTexDesc(finalRemainder, v);
    const isExact = finalRemainder.every(isZero);

    // Summary representation
    let answerTex = '';
    if (isExact) {
      answerTex = `\\frac{${pTex}}{${dTex}} = ${finalQuotientTex}`;
    } else {
      answerTex = `\\frac{${pTex}}{${dTex}} = ${finalQuotientTex} + \\frac{${finalRemainderTex}}{${dTex}}`;
    }

    steps.push({
      title: 'State Quotient and Remainder',
      desc: isExact
        ? 'The remainder is 0, meaning the divisor divides the dividend evenly.'
        : `The degree of the remainder (${finalRemainder.length - 1}) is less than the divisor degree (${degD}).`,
      tex: `\\text{Quotient: } Q(${v}) = ${finalQuotientTex}, \\qquad \\text{Remainder: } R(${v}) = ${finalRemainderTex}`,
    });

    steps.push({
      title: 'Division Verification Identity',
      desc: 'Verify using the Division Algorithm Theorem: P(x) = D(x) · Q(x) + R(x).',
      tex: `${pTex} = (${dTex}) \\cdot (${finalQuotientTex}) ${isExact ? '' : `+ (${finalRemainderTex})`}`,
    });

    return {
      steps,
      quotientTex: finalQuotientTex,
      remainderTex: finalRemainderTex,
      answerTex,
      isExact,
      quotient: quotientCoeffs,
      remainder: finalRemainder,
    };
  } catch (err) {
    return { error: `Polynomial division error: ${err.message}` };
  }
}

/**
 * Synthetic Division (for linear divisors x - c or ax - b)
 */
export function solveSyntheticDivision(dividendRaw, divisorRaw, opts = {}) {
  const v = opts.variable || 'x';
  const decimal = !!opts.decimal;

  try {
    const P = parsePolyDesc(dividendRaw, v);
    const D = parsePolyDesc(divisorRaw, v);

    if (D.length !== 2) {
      return {
        error: `Synthetic division requires a linear divisor of degree 1 (e.g. "${v} - 2" or "2${v} + 3"). For higher-degree divisors, use Polynomial Long Division.`,
      };
    }

    const a = D[0];
    const b = D[1];
    // Divisor is a*x + b = 0 => root c = -b / a
    const cVal = math.divide(math.unaryMinus(b), a);

    const steps = [];
    const pTex = polyTexDesc(P, v);
    const dTex = polyTexDesc(D, v);

    steps.push({
      title: 'Find the root of the linear divisor',
      desc: `Set the divisor equal to 0 and solve for the root c: \\(${dTex} = 0 \\implies ${v} = ${texFrac(cVal)}\\).`,
      tex: `c = ${texFrac(cVal)}`,
    });

    // Synthetic division steps
    const n = P.length;
    const topRow = [...P];
    const multRow = [math.fraction(0)];
    const bottomRow = [topRow[0]];

    for (let i = 1; i < n; i++) {
      const mult = math.multiply(bottomRow[i - 1], cVal);
      multRow.push(mult);
      bottomRow.push(math.add(topRow[i], mult));
    }

    // If divisor leading coeff a != 1, divide quotient coefficients by a
    const unscaledQuotient = bottomRow.slice(0, n - 1);
    const remainderVal = bottomRow[n - 1];

    const scaledQuotient = math.number(a) === 1
      ? unscaledQuotient
      : unscaledQuotient.map((val) => math.divide(val, a));

    // LaTeX Tableau for synthetic division
    const colsFormat = `c|${'r'.repeat(n)}`;
    const row1Tex = topRow.map((x) => texFrac(x)).join(' & ');
    const row2Tex = multRow.map((x, idx) => (idx === 0 ? '' : texFrac(x))).join(' & ');
    const row3Tex = bottomRow.map((x) => texFrac(x)).join(' & ');

    const tableauTex = `\\begin{array}{${colsFormat}}
${texFrac(cVal)} & ${row1Tex} \\\\
& ${row2Tex} \\\\
\\hline
& ${row3Tex}
\\end{array}`;

    steps.push({
      title: 'Synthetic Division Table',
      desc: 'Bring down the leading coefficient, multiply by c, write under the next coefficient, and add.',
      tex: tableauTex,
    });

    const quotientTex = polyTexDesc(scaledQuotient, v);
    const remainderTex = texFrac(remainderVal);
    const isExact = isZero(remainderVal);

    if (math.number(a) !== 1) {
      steps.push({
        title: `Adjust for leading coefficient a = ${texFrac(a)}`,
        desc: `Since the divisor is \\(${dTex}\\) with leading coefficient ${texFrac(a)}, divide the resulting quotient coefficients by ${texFrac(a)}.`,
        tex: `Q(${v}) = \\frac{1}{${texFrac(a)}} \\left(${polyTexDesc(unscaledQuotient, v)}\\right) = ${quotientTex}`,
      });
    }

    const answerTex = isExact
      ? `\\frac{${pTex}}{${dTex}} = ${quotientTex}`
      : `\\frac{${pTex}}{${dTex}} = ${quotientTex} + \\frac{${remainderTex}}{${dTex}}`;

    steps.push({
      title: 'Read the Solution',
      desc: `The bottom row gives the coefficients of the quotient (of degree ${scaledQuotient.length - 1}) and the remainder.`,
      tex: `Q(${v}) = ${quotientTex}, \\qquad R = ${remainderTex}`,
    });

    return {
      steps,
      quotientTex,
      remainderTex,
      answerTex,
      isExact,
      tableauTex,
    };
  } catch (err) {
    return { error: `Synthetic division error: ${err.message}` };
  }
}

/**
 * Polynomial Multiplication & Expansion (FOIL / Distributive Property)
 */
export function solvePolyMultiplication(poly1Raw, poly2Raw, opts = {}) {
  const v = opts.variable || 'x';
  const decimal = !!opts.decimal;

  try {
    const P = parsePolyDesc(poly1Raw, v);
    const Q = parsePolyDesc(poly2Raw, v);

    const pTex = polyTexDesc(P, v);
    const qTex = polyTexDesc(Q, v);

    const steps = [];

    steps.push({
      title: 'Write Product in Factored Form',
      desc: 'Multiply the two polynomials using the distributive property.',
      tex: `\\left(${pTex}\\right) \\cdot \\left(${qTex}\\right)`,
    });

    // Step 2: Show distribution of each term of P across Q
    const degP = P.length - 1;
    const degQ = Q.length - 1;

    const distributedTerms = [];
    for (let i = 0; i <= degP; i++) {
      if (isZero(P[i])) continue;
      const termDeg = degP - i;
      const termTex = polyTexDesc(
        Array.from({ length: termDeg + 1 }, (_, k) => (k === 0 ? P[i] : math.fraction(0))),
        v
      );
      distributedTerms.push({
        termTex,
        polyTex: qTex,
        expr: `${termTex} \\cdot \\left(${qTex}\\right)`,
      });
    }

    steps.push({
      title: 'Apply the Distributive Property',
      desc: 'Distribute each term of the first polynomial across the entire second polynomial.',
      tex: distributedTerms.map((d) => d.expr).join(' + ').replace(/\+\s*-/g, '- '),
    });

    // Step 3: Expand individual product terms
    const individualTerms = [];
    const degRes = degP + degQ;
    const powerGroups = Array.from({ length: degRes + 1 }, () => []);

    for (let i = 0; i <= degP; i++) {
      if (isZero(P[i])) continue;
      const powerP = degP - i;
      for (let j = 0; j <= degQ; j++) {
        if (isZero(Q[j])) continue;
        const powerQ = degQ - j;
        const totalPower = powerP + powerQ;
        const prodCoeff = math.multiply(P[i], Q[j]);

        const singleTermTex = polyTexDesc(
          Array.from({ length: totalPower + 1 }, (_, k) => (k === 0 ? prodCoeff : math.fraction(0))),
          v
        );
        individualTerms.push(singleTermTex);
        powerGroups[totalPower].push(prodCoeff);
      }
    }

    steps.push({
      title: 'Multiply Coefficients and Add Exponents',
      desc: 'Compute each term using the product rule of exponents: xᵃ · xᵇ = xᵃ⁺ᵇ.',
      tex: individualTerms.join(' + ').replace(/\+\s*-/g, '- '),
    });

    // Step 4: Group like terms by powers
    const groupedParts = [];
    for (let p = degRes; p >= 0; p--) {
      const coeffs = powerGroups[p];
      if (!coeffs || !coeffs.length) continue;
      const varPow = p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`;
      const sumCoeffs = coeffs.map((c) => texFrac(c)).join(' + ').replace(/\+\s*-/g, '- ');
      groupedParts.push(`\\left(${sumCoeffs}\\right)${varPow}`);
    }

    steps.push({
      title: 'Group and Combine Like Terms',
      desc: 'Collect terms having the same exponent and sum their coefficients.',
      tex: groupedParts.join(' + ').replace(/\+\s*-/g, '- '),
    });

    // Final result
    const resultPoly = multiplyPolyDesc(P, Q);
    const finalTex = polyTexDesc(resultPoly, v);

    steps.push({
      title: 'Standard Form Result',
      desc: 'The final expanded polynomial arranged in descending degree order.',
      tex: finalTex,
    });

    return {
      steps,
      answerTex: `\\left(${pTex}\\right)\\left(${qTex}\\right) = ${finalTex}`,
      resultPoly,
      finalTex,
    };
  } catch (err) {
    return { error: `Polynomial multiplication error: ${err.message}` };
  }
}
