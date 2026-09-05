// Literal Equation & Formula Solver (solving for a specified variable in terms of others)
import {
  math, texExpr,
} from './utils.js';

// Parse query for explicit "solve for [var]" directive
export function extractTargetVar(input) {
  let targetVar = null;
  let cleanInput = String(input || '');

  const m1 = cleanInput.match(/solve\s+(?:for\s+)?([a-zA-Z])/i);
  if (m1) {
    targetVar = m1[1].toLowerCase();
    cleanInput = cleanInput.replace(/solve\s+(?:for\s+)?[a-zA-Z]/i, '');
  } else {
    const m2 = cleanInput.match(/,\s*(?:for\s+)?([a-zA-Z])\s*$/i);
    if (m2) {
      targetVar = m2[1].toLowerCase();
      cleanInput = cleanInput.replace(/,\s*(?:for\s+)?[a-zA-Z]\s*$/i, '');
    }
  }

  cleanInput = cleanInput.replace(/^[,;:\s]+|[,;:\s]+$/g, '').trim();
  return { targetVar, cleanInput };
}

export function solveLiteralEquation(L, R, targetVar) {
  const steps = [];
  const v = targetVar;

  steps.push({
    title: `Solve literal equation for ${v}`,
    desc: `Isolate ${v} in terms of the other variables in the formula.`,
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  try {
    const diff = `(${L}) - (${R})`;
    const node = math.parse(diff);

    // Check if linear in targetVar: d(diff)/d(targetVar) should not contain targetVar
    const d = math.derivative(node, v);
    let hasVInD = false;
    d.traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasVInD = true; });

    if (hasVInD) {
      // Non-linear in targetVar
      return null;
    }

    const coeffNode = math.simplify(d);
    // Constant term: set targetVar = 0 in diff
    const constNode = math.simplify(
      node.transform((n) => (n.isSymbolNode && n.name === v ? new math.ConstantNode(0) : n))
    );

    const coeffStr = coeffNode.toString();
    const constStr = constNode.toString();

    // The equation in diff is: coeffStr * v + constStr = 0
    // Move constStr to right: coeffStr * v = -constStr
    const rhsNode = math.simplify(`-(${constStr})`);
    const rhsStr = rhsNode.toString();

    steps.push({
      title: `Collect terms containing ${v} on one side`,
      desc: `Group all terms with ${v} on the left side and move all other terms to the right side.`,
      tex: `\\left(${texExpr(coeffStr)}\\right) \\cdot ${v} = ${texExpr(rhsStr)}`,
    });

    steps.push({
      title: `Divide by the coefficient factor`,
      desc: `Divide both sides by (${texExpr(coeffStr)}) to isolate ${v}.`,
      tex: `${v} = \\frac{${texExpr(rhsStr)}}{${texExpr(coeffStr)}}`,
    });

    // Simplify the resulting fraction
    let simplifiedAns = '';
    try {
      simplifiedAns = math.simplify(`(${rhsStr}) / (${coeffStr})`).toString();
    } catch {
      simplifiedAns = `(${rhsStr}) / (${coeffStr})`;
    }

    const ansTex = `${v} = ${texExpr(simplifiedAns)}`;
    if (texExpr(simplifiedAns) !== `\\frac{${texExpr(rhsStr)}}{${texExpr(coeffStr)}}`) {
      steps.push({
        title: 'Simplify the formula',
        desc: 'Reduce the fraction to simplest algebraic form.',
        tex: ansTex,
      });
    }

    return {
      steps,
      answerTex: ansTex,
      answerNote: `Formula solved for ${v}.`,
      answers: [{ tex: ansTex, num: NaN }],
    };
  } catch {
    return null;
  }
}
