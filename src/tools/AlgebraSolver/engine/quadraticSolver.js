// Quadratic Equation Solver with comprehensive teacher-grade explanations
import {
  math, approxFrac, texFrac, trimNum, fmtVal, gcdInt, lcmInt, simplifyRadical, texExpr,
} from './utils.js';
import { findConstantDenominators } from './linearSolver.js';

// Extract quadratic coefficients a*x^2 + b*x + c = 0
export function parseQuadraticCoeffs(exprStr, v) {
  try {
    const node = math.parse(exprStr);
    // Check degree by differentiating twice
    const d1 = math.derivative(node, v);
    const d2 = math.derivative(d1, v);
    const d3 = math.derivative(d2, v);

    // If d3 is not identically 0, degree > 2
    const d3Simp = math.simplify(d3);
    if (d3Simp.toString() !== '0') {
      // Evaluate on multiple points to ensure it is not 0
      const c = math.compile(d3Simp.toString());
      if (Math.abs(c.evaluate({ [v]: 1 })) > 1e-9 || Math.abs(c.evaluate({ [v]: 3 })) > 1e-9) {
        return null;
      }
    }

    // a = d2 / 2
    const aVal = Number(math.evaluate(math.simplify(d2).toString())) / 2;
    if (Math.abs(aVal) < 1e-12) return null; // not quadratic, degree < 2

    // b = d1(0)
    const d1Zero = d1.transform((n) =>
      n.isSymbolNode && n.name === v ? new math.ConstantNode(0) : n
    );
    const bVal = Number(math.evaluate(math.simplify(d1Zero).toString()));

    // c = f(0)
    const fZero = node.transform((n) =>
      n.isSymbolNode && n.name === v ? new math.ConstantNode(0) : n
    );
    const cVal = Number(math.evaluate(math.simplify(fZero).toString()));

    if (!isFinite(aVal) || !isFinite(bVal) || !isFinite(cVal)) return null;

    return { a: aVal, b: bVal, c: cVal };
  } catch {
    return null;
  }
}

// Format standard quadratic form ax^2 + bx + c = 0
export function formatStandardQuad(a, b, c, v) {
  let res = '';
  if (a === 1) res = `${v}^2`;
  else if (a === -1) res = `-${v}^2`;
  else res = `${a}${v}^2`;

  if (b > 0) res += ` + ${b === 1 ? '' : b}${v}`;
  else if (b < 0) res += ` - ${Math.abs(b) === 1 ? '' : Math.abs(b)}${v}`;

  if (c > 0) res += ` + ${c}`;
  else if (c < 0) res += ` - ${Math.abs(c)}`;

  return `${res} = 0`;
}

export function solveQuadraticEquation(L, R, v, decimal = false) {
  const steps = [];
  const origTex = `${texExpr(L)} = ${texExpr(R)}`;
  steps.push({
    title: 'Original quadratic equation',
    desc: 'Solve the equation for the unknown variable.',
    tex: origTex,
  });

  let curL = L;
  let curR = R;

  // Step A: Clear fractions if present
  try {
    const nodeL = math.parse(L);
    const nodeR = math.parse(R);
    const densL = findConstantDenominators(nodeL, v);
    const densR = findConstantDenominators(nodeR, v);
    const allDens = [...new Set([...densL, ...densR])];
    if (allDens.length > 0) {
      const lcd = allDens.reduce((acc, d) => lcmInt(acc, d), 1);
      if (lcd > 1) {
        steps.push({
          title: 'Clear fractions using LCD',
          desc: `Multiply both sides by the least common denominator (${lcd}) to remove fractions.`,
          tex: `${lcd} \\cdot \\left(${texExpr(curL)}\\right) = ${lcd} \\cdot \\left(${texExpr(curR)}\\right)`,
        });
        curL = math.rationalize(`${lcd} * (${curL})`, {}, false).toString();
        curR = math.rationalize(`${lcd} * (${curR})`, {}, false).toString();
        steps.push({
          title: 'Equation with fractions cleared',
          desc: 'Each term is now an integer multiple.',
          tex: `${texExpr(curL)} = ${texExpr(curR)}`,
        });
      }
    }
  } catch {}

  // Step B: Move all terms to left side: (curL) - (curR) = 0
  const diffStr = `(${curL}) - (${curR})`;
  const parsed = parseQuadraticCoeffs(diffStr, v);
  if (!parsed) return null;

  let { a, b, c } = parsed;

  // Scale coefficients to integers if they are rational
  const fA = approxFrac(a, 10000, 1e-9) || math.fraction(a);
  const fB = approxFrac(b, 10000, 1e-9) || math.fraction(b);
  const fC = approxFrac(c, 10000, 1e-9) || math.fraction(c);

  const denLcm = lcmInt(lcmInt(Number(fA.d), Number(fB.d)), Number(fC.d));
  if (denLcm > 1) {
    a = Math.round(a * denLcm);
    b = Math.round(b * denLcm);
    c = Math.round(c * denLcm);
  } else {
    a = Math.round(a);
    b = Math.round(b);
    c = Math.round(c);
  }

  // Ensure leading coefficient a > 0 for standard form
  let multipliedNegative = false;
  if (a < 0) {
    a = -a;
    b = -b;
    c = -c;
    multipliedNegative = true;
  }

  // Divide out overall integer gcd of a, b, c
  const g = gcdInt(gcdInt(a, b), c);
  if (g > 1) {
    a /= g;
    b /= g;
    c /= g;
  }

  const stdTex = formatStandardQuad(a, b, c, v);
  if (multipliedNegative) {
    steps.push({
      title: 'Standard quadratic form',
      desc: 'Move all terms to one side and multiply by -1 so the leading coefficient is positive: ax² + bx + c = 0.',
      tex: stdTex,
    });
  } else {
    steps.push({
      title: 'Standard quadratic form',
      desc: 'Rearrange all terms to the left side so the equation equals zero: ax² + bx + c = 0.',
      tex: stdTex,
    });
  }

  steps.push({
    title: 'Identify coefficients',
    desc: 'Extract the coefficients for standard quadratic solving.',
    tex: `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`,
  });

  const D = b * b - 4 * a * c;

  // CASE 1: Pure Quadratic (b === 0)
  if (b === 0) {
    const k = -c / a;
    steps.push({
      title: 'Isolate the squared term',
      desc: 'Since there is no linear term (b = 0), isolate x² on the left side.',
      tex: `${v}^2 = ${fmtVal(math.fraction(-c, a), decimal)}`,
    });

    if (k > 0) {
      const { k: radOut, m: radIn } = simplifyRadical(Math.round(Math.abs(-c * a)));
      const den = Math.abs(a);
      const rootGcd = gcdInt(radOut, den);
      const simpOut = radOut / rootGcd;
      const simpDen = den / rootGcd;

      let radTex = '';
      if (radIn === 1) {
        radTex = simpDen === 1 ? `${simpOut}` : `\\frac{${simpOut}}{${simpDen}}`;
      } else {
        const numPart = simpOut === 1 ? `\\sqrt{${radIn}}` : `${simpOut}\\sqrt{${radIn}}`;
        radTex = simpDen === 1 ? numPart : `\\frac{${numPart}}{${simpDen}}`;
      }

      steps.push({
        title: 'Apply the Square Root Property',
        desc: 'Take the square root of both sides, remembering both positive and negative roots: x = ±√k.',
        tex: `${v} = \\pm \\sqrt{${fmtVal(math.fraction(-c, a), decimal)}} = \\pm ${radTex}`,
      });

      const r1Num = Math.sqrt(k);
      const r2Num = -Math.sqrt(k);
      const answerTex = `${v} = ${radTex}, \\quad ${v} = -${radTex}`;
      const note = radIn !== 1 && !decimal ? `Decimal: ${v} ≈ ±${trimNum(r1Num)}` : null;

      return {
        steps,
        answerTex,
        answerNote: note,
        answers: [
          { tex: radTex, num: r1Num },
          { tex: `-${radTex}`, num: r2Num },
        ],
      };
    } else if (k === 0) {
      steps.push({
        title: 'Apply the Square Root Property',
        desc: 'Taking the square root of 0 yields a single root.',
        tex: `${v} = 0`,
      });
      return {
        steps,
        answerTex: `${v} = 0`,
        answerNote: 'Single real root (multiplicity 2).',
        answers: [{ tex: '0', num: 0 }],
      };
    } else {
      // k < 0 -> imaginary roots
      const absK = Math.abs(k);
      const { k: radOut, m: radIn } = simplifyRadical(Math.round(Math.abs(c * a)));
      const den = Math.abs(a);
      const rootGcd = gcdInt(radOut, den);
      const simpOut = radOut / rootGcd;
      const simpDen = den / rootGcd;

      let radTex = '';
      if (radIn === 1) {
        radTex = simpDen === 1 ? `${simpOut}i` : `\\frac{${simpOut}}{${simpDen}}i`;
      } else {
        const numPart = simpOut === 1 ? `i\\sqrt{${radIn}}` : `${simpOut}i\\sqrt{${radIn}}`;
        radTex = simpDen === 1 ? numPart : `\\frac{${numPart}}{${simpDen}}`;
      }

      steps.push({
        title: 'Apply the Square Root Property (Complex Roots)',
        desc: 'Since the right side is negative, taking the square root introduces the imaginary unit i = √(-1).',
        tex: `${v} = \\pm \\sqrt{${k}} = \\pm ${radTex}`,
      });

      return {
        steps,
        answerTex: `${v} = \\pm ${radTex}`,
        answerNote: 'Two complex conjugate roots.',
        answers: [
          { tex: radTex, num: NaN },
          { tex: `-${radTex}`, num: NaN },
        ],
      };
    }
  }

  // CASE 2: Incomplete Quadratic without Constant Term (c === 0)
  if (c === 0) {
    const factorCoeff = gcdInt(a, Math.abs(b));
    const remA = a / factorCoeff;
    const remB = b / factorCoeff;
    const insideParen = remA === 1 ? `${v}` : `${remA}${v}`;
    const signB = remB > 0 ? `+ ${remB}` : `- ${Math.abs(remB)}`;
    const factorOutside = factorCoeff === 1 ? `${v}` : `${factorCoeff}${v}`;

    steps.push({
      title: 'Factor out the Greatest Common Factor (GCF)',
      desc: `Since the constant term c = 0, both terms contain ${v}. Factor out ${factorOutside}.`,
      tex: `${factorOutside}\\left(${insideParen} ${signB}\\right) = 0`,
    });

    steps.push({
      title: 'Apply the Zero Product Property',
      desc: 'If a product of factors equals zero, at least one of the individual factors must equal zero.',
      tex: `${v} = 0 \\quad\\text{or}\\quad ${insideParen} ${signB} = 0`,
    });

    const root2Frac = math.fraction(-b, a);
    steps.push({
      title: 'Solve each linear factor',
      desc: 'Isolate the variable in each branch.',
      tex: `${v} = 0, \\quad ${v} = ${texFrac(root2Frac)}`,
    });

    return {
      steps,
      answerTex: `${v} = 0, \\quad ${v} = ${texFrac(root2Frac)}`,
      answerNote: null,
      answers: [
        { tex: '0', num: 0 },
        { tex: texFrac(root2Frac), num: math.number(root2Frac) },
      ],
    };
  }

  // CASE 3: Factorable Trinomial (D is positive perfect square)
  const sqrtD = Math.round(Math.sqrt(Math.max(0, D)));
  const isPerfectSquare = D > 0 && sqrtD * sqrtD === D;

  if (isPerfectSquare) {
    // Find integer factoring: (a1*x + b1)(a2*x + b2) = 0
    // ac method: find p, q such that p * q = a * c and p + q = b
    const ac = a * c;
    let p = null, q = null;
    for (let factor = -Math.abs(ac); factor <= Math.abs(ac); factor++) {
      if (factor !== 0 && ac % factor === 0) {
        const other = ac / factor;
        if (factor + other === b) {
          p = factor;
          q = other;
          break;
        }
      }
    }

    if (p !== null && q !== null) {
      if (a === 1) {
        const pSign = p > 0 ? `+ ${p}` : `- ${Math.abs(p)}`;
        const qSign = q > 0 ? `+ ${q}` : `- ${Math.abs(q)}`;
        steps.push({
          title: 'Factor the quadratic trinomial',
          desc: `Find two numbers that multiply to c (${c}) and add to b (${b}): the numbers are ${p} and ${q}.`,
          tex: `(${v} ${pSign})(${v} ${qSign}) = 0`,
        });
      } else {
        steps.push({
          title: 'Factor by grouping (the ac-method)',
          desc: `Find two numbers that multiply to a · c = ${ac} and add to b = ${b}: the numbers are ${p} and ${q}. Split the middle term ${b}${v} into ${p}${v} + ${q}${v}.`,
          tex: `${a}${v}^2 ${p > 0 ? '+' : ''}${p}${v} ${q > 0 ? '+' : ''}${q}${v} ${c > 0 ? '+' : ''}${c} = 0`,
        });

        // Grouping: gcd(a, p)
        const g1 = gcdInt(a, Math.abs(p));
        const remA1 = a / g1;
        const remP1 = p / g1;
        const g2 = gcdInt(Math.abs(q), Math.abs(c));
        const sign2 = q > 0 ? '+' : '-';

        steps.push({
          title: 'Group and factor common terms',
          desc: 'Factor out the greatest common factor from each pair of terms.',
          tex: `(${remA1}${v} ${remP1 > 0 ? '+' : ''}${remP1})(${g1}${v} ${sign2} ${g2}) = 0`,
        });
      }

      steps.push({
        title: 'Apply the Zero Product Property',
        desc: 'Set each linear factor equal to zero and solve for the variable.',
        tex: `${v} = ${texFrac(math.fraction(-p, a))}, \\quad ${v} = ${texFrac(math.fraction(-q, a))}`,
      });
    }

    // Also include Quadratic Formula verification for students/teachers
    steps.push({
      title: 'Verification using the Quadratic Formula',
      desc: 'Confirm the solutions by substituting a, b, and c into x = (-b ± √(b² - 4ac)) / (2a).',
      tex: `${v} = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4(${a})(${c})}}{2(${a})} = \\frac{${-b} \\pm ${sqrtD}}{${2 * a}}`,
    });

    const root1 = math.fraction(-b + sqrtD, 2 * a);
    const root2 = math.fraction(-b - sqrtD, 2 * a);
    const r1Num = math.number(root1);
    const r2Num = math.number(root2);

    steps.push({
      title: 'Simplify the roots',
      desc: 'Calculate the two distinct solutions.',
      tex: `${v}_1 = \\frac{${-b + sqrtD}}{${2 * a}} = ${texFrac(root1)}, \\quad ${v}_2 = \\frac{${-b - sqrtD}}{${2 * a}} = ${texFrac(root2)}`,
    });

    const answerTex = `${v} = ${texFrac(root1)}, \\quad ${v} = ${texFrac(root2)}`;
    return {
      steps,
      answerTex,
      answerNote: null,
      answers: [
        { tex: texFrac(root1), num: r1Num },
        { tex: texFrac(root2), num: r2Num },
      ],
    };
  }

  // CASE 4: General Quadratic (Irrational or Complex Roots)
  steps.push({
    title: 'State the Quadratic Formula',
    desc: 'When a quadratic does not factor cleanly, use the universal Quadratic Formula.',
    tex: `${v} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`,
  });

  steps.push({
    title: 'Substitute coefficients into the formula',
    desc: `Substitute a = ${a}, b = ${b}, and c = ${c}.`,
    tex: `${v} = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4(${a})(${c})}}{2(${a})}`,
  });

  steps.push({
    title: 'Compute the Discriminant (Δ = b² - 4ac)',
    desc: D > 0
      ? `Δ = ${b * b} - ${4 * a * c} = ${D} > 0. A positive discriminant means there are two distinct real irrational roots.`
      : D === 0
      ? 'Δ = 0. The discriminant is zero, meaning there is exactly one repeated real root.'
      : `Δ = ${b * b} - ${4 * a * c} = ${D} < 0. A negative discriminant means there are two complex conjugate roots.`,
    tex: `\\Delta = b^2 - 4ac = ${D}`,
  });

  if (D === 0) {
    const root = math.fraction(-b, 2 * a);
    steps.push({
      title: 'Calculate the single repeated root',
      desc: 'Since the radical evaluates to zero, the only root is -b / (2a).',
      tex: `${v} = \\frac{${-b}}{${2 * a}} = ${texFrac(root)}`,
    });
    return {
      steps,
      answerTex: `${v} = ${texFrac(root)}`,
      answerNote: 'One repeated real root (multiplicity 2).',
      answers: [{ tex: texFrac(root), num: math.number(root) }],
    };
  }

  if (D > 0) {
    const { k: radOut, m: radIn } = simplifyRadical(D);
    const den = 2 * a;
    const gNum = gcdInt(gcdInt(Math.abs(-b), radOut), den);
    const simpB = -b / gNum;
    const simpRad = radOut / gNum;
    const simpDen = den / gNum;

    let radPart = '';
    if (radIn === 1) {
      radPart = `${simpRad}`;
    } else {
      radPart = simpRad === 1 ? `\\sqrt{${radIn}}` : `${simpRad}\\sqrt{${radIn}}`;
    }

    let exactTex = '';
    if (simpDen === 1) {
      exactTex = `${simpB} \\pm ${radPart}`;
    } else {
      exactTex = `\\frac{${simpB} \\pm ${radPart}}{${simpDen}}`;
    }

    steps.push({
      title: 'Simplify the radical and reduce common factors',
      desc: `Simplify √${D} = ${radOut > 1 ? `${radOut}√${radIn}` : `√${radIn}`} and divide numerator and denominator by the common factor ${gNum}.`,
      tex: `${v} = ${exactTex}`,
    });

    const r1Num = (-b + Math.sqrt(D)) / (2 * a);
    const r2Num = (-b - Math.sqrt(D)) / (2 * a);

    const answerTex = decimal
      ? `${v} \\approx ${trimNum(r1Num)}, \\quad ${v} \\approx ${trimNum(r2Num)}`
      : `${v} = ${exactTex}`;

    const answerNote = !decimal
      ? `Decimal approximations: ${v} ≈ ${trimNum(r1Num)}, ${v} ≈ ${trimNum(r2Num)}`
      : null;

    return {
      steps,
      answerTex,
      answerNote,
      answers: [
        { tex: `${simpDen === 1 ? `${simpB} + ${radPart}` : `\\frac{${simpB} + ${radPart}}{${simpDen}}`}`, num: r1Num },
        { tex: `${simpDen === 1 ? `${simpB} - ${radPart}` : `\\frac{${simpB} - ${radPart}}{${simpDen}}`}`, num: r2Num },
      ],
    };
  }

  // D < 0 -> Complex roots
  const absD = Math.abs(D);
  const { k: radOut, m: radIn } = simplifyRadical(absD);
  const den = 2 * a;
  const gNum = gcdInt(gcdInt(Math.abs(-b), radOut), den);
  const simpB = -b / gNum;
  const simpRad = radOut / gNum;
  const simpDen = den / gNum;

  let radPart = '';
  if (radIn === 1) {
    radPart = `${simpRad}i`;
  } else {
    radPart = simpRad === 1 ? `i\\sqrt{${radIn}}` : `${simpRad}i\\sqrt{${radIn}}`;
  }

  let exactTex = '';
  if (simpDen === 1) {
    exactTex = `${simpB} \\pm ${radPart}`;
  } else {
    exactTex = `\\frac{${simpB} \\pm ${radPart}}{${simpDen}}`;
  }

  steps.push({
    title: 'Simplify using the imaginary unit i = √(-1)',
    desc: `Since Δ = -${absD}, write √(-${absD}) = i√${absD} = ${radOut > 1 ? `${radOut}i√${radIn}` : `i√${radIn}`}, then reduce common factors.`,
    tex: `${v} = ${exactTex}`,
  });

  const rePart = -b / (2 * a);
  const imPart = Math.sqrt(absD) / (2 * a);
  const answerTex = decimal
    ? `${v} \\approx ${trimNum(rePart)} \\pm ${trimNum(imPart)}i`
    : `${v} = ${exactTex}`;

  return {
    steps,
    answerTex,
    answerNote: 'Two complex conjugate roots.',
    answers: [
      { tex: `${simpDen === 1 ? `${simpB} + ${radPart}` : `\\frac{${simpB} + ${radPart}}{${simpDen}}`}`, num: NaN },
      { tex: `${simpDen === 1 ? `${simpB} - ${radPart}` : `\\frac{${simpB} - ${radPart}}{${simpDen}}`}`, num: NaN },
    ],
  };
}
