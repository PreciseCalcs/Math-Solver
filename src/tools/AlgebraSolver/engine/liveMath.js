import katex from 'katex';
import { math, preprocess } from './utils.js';

// Clean redundant \cdot and spaces where algebraic juxtaposition is standard
export function cleanTexMultiplication(tex) {
  if (!tex) return '';
  return tex
    // { x} -> {x}
    .replace(/\{\s+([a-zA-Z0-9]+)\s*\}/g, '{$1}')
    // \left( x -> \left(x
    .replace(/\\left\(\s+([a-zA-Z0-9])/g, '\\left($1')
    // 3\cdot x -> 3x
    .replace(/(\d)\s*\\cdot\s*([a-zA-Z])/g, '$1$2')
    // 2\cdot\left( -> 2\left(
    .replace(/(\d)\s*\\cdot\s*(\\left\(|\\sqrt|\()/g, '$1$2')
    // \right)\cdot\left( -> \right)\left(
    .replace(/\\right\)\s*\\cdot\s*\\left\(/g, '\\right)\\left(')
    // \right)\cdot x -> \right) x
    .replace(/\\right\)\s*\\cdot\s*([a-zA-Z])/g, '\\right)$1')
    // \cdot i -> i (e.g. 2\cdot i -> 2i)
    .replace(/\\cdot\s*i\b/g, 'i')
    // Remove space between number and variable if spaced
    .replace(/(\d)\s+([a-zA-Z])/g, '$1$2');
}

// Convert a single expression side (without comparator) to LaTeX
function exprSideToTex(rawSide) {
  let str = String(rawSide ?? '').trim();
  if (!str) return '';

  // Check if user is typing raw LaTeX directly (e.g. \frac, \sqrt)
  if (str.includes('\\')) {
    try {
      katex.renderToString(str, { throwOnError: true });
      return str;
    } catch {
      // Continue to parser
    }
  }

  // Count unclosed parentheses and balance for preview parsing
  const openParens = (str.match(/\(/g) || []).length;
  const closeParens = (str.match(/\)/g) || []).length;
  let balanced = str;
  if (openParens > closeParens) {
    balanced += ')'.repeat(openParens - closeParens);
  }

  // Check for trailing operator: e.g. '2x +', 'x -', 'x /', 'x *', 'x ^'
  const trailingOpMatch = balanced.match(/[\+\-\*\/\^]\s*$/);
  let hasTrailingOp = false;
  let parseTarget = balanced;
  let trailingOp = '';

  if (trailingOpMatch) {
    hasTrailingOp = true;
    trailingOp = trailingOpMatch[0].trim();
    parseTarget = balanced.replace(/[\+\-\*\/\^]\s*$/, '').trim();
  }

  if (!parseTarget) {
    if (hasTrailingOp) return `\\dots ${trailingOp}`;
    return '';
  }

  try {
    const preprocessed = preprocess(parseTarget);
    const node = math.parse(preprocessed);
    let tex = node.toTex({ parenthesis: 'auto', implicit: 'hide' });
    tex = cleanTexMultiplication(tex);

    if (hasTrailingOp) {
      const opTex = { '+': '+', '-': '-', '*': '\\cdot', '/': '\\div', '^': '^' }[trailingOp] || trailingOp;
      tex += ` ${opTex} \\; \\dots`;
    }

    return tex;
  } catch {
    // Fallback: simple token replacement for live preview
    let fallback = str
      .replace(/sqrt\s*\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/abs\s*\(([^)]+)\)/g, '\\left|$1\\right|')
      .replace(/pi\b/g, '\\pi')
      .replace(/\^([0-9a-zA-Z]+)/g, '^{$1}')
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\s*\/\s*/g, ' / ');
    return fallback;
  }
}

/**
 * Converts any free-form math input (equation, inequality, or expression)
 * into formatted LaTeX for real-time KaTeX rendering.
 */
export function toLiveMathTex(rawInput) {
  if (!rawInput || !String(rawInput).trim()) {
    return {
      tex: '',
      isValid: false,
      isTyping: false,
      isEmpty: true,
      status: 'empty',
    };
  }

  const raw = String(rawInput).trim();

  // If user entered raw LaTeX that renders cleanly
  if (raw.includes('\\')) {
    try {
      katex.renderToString(raw, { throwOnError: true });
      return {
        tex: raw,
        isValid: true,
        isTyping: false,
        isEmpty: false,
        status: 'valid',
      };
    } catch {
      // Continue with normal parsing
    }
  }

  // Detect comparator: <=, >=, !=, <, >, =
  const compMatch = raw.match(/(<=|>=|!=|==|<|>|=)/);

  if (compMatch) {
    const op = compMatch[1];
    const parts = raw.split(op);
    const leftRaw = parts[0];
    const rightRaw = parts.slice(1).join(op); // in case of multiple

    const leftTex = exprSideToTex(leftRaw);
    const rightTex = exprSideToTex(rightRaw);

    const opMap = {
      '<=': '\\le',
      '>=': '\\ge',
      '!=': '\\neq',
      '==': '=',
      '=': '=',
      '<': '<',
      '>': '>',
    };
    const opTex = opMap[op] || '=';

    const fullTex = `${leftTex || '\\dots'} ${opTex} ${rightTex || '\\dots'}`;

    // Test KaTeX compilation
    let isValid = false;
    try {
      katex.renderToString(fullTex, { throwOnError: true });
      isValid = Boolean(leftTex && rightTex && !leftTex.includes('\\dots') && !rightTex.includes('\\dots'));
    } catch {
      isValid = false;
    }

    return {
      tex: fullTex,
      isValid,
      isTyping: !isValid,
      isEmpty: false,
      status: isValid ? 'valid' : 'typing',
    };
  }

  // Single expression
  const tex = exprSideToTex(raw);
  let isValid = false;
  try {
    katex.renderToString(tex, { throwOnError: true });
    isValid = Boolean(tex && !tex.includes('\\dots'));
  } catch {
    isValid = false;
  }

  return {
    tex,
    isValid,
    isTyping: !isValid,
    isEmpty: false,
    status: isValid ? 'valid' : 'typing',
  };
}
