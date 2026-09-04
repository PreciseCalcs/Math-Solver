// Shared math utilities: parsing, preprocessing, exact fractions, formatting
import { create, all } from 'mathjs';

export const math = create(all);

export const gcdInt = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
};
export const lcmInt = (a, b) => (!a || !b ? 0 : Math.abs(a * b) / gcdInt(a, b));

// Function names protected during implicit-multiplication insertion.
// [sourceName, mathjsName] — ln -> natural log, log -> base 10
const FUNC_MAP = [
  ['nthRoot', 'nthRoot'], ['asin', 'asin'], ['acos', 'acos'], ['atan', 'atan'],
  ['sinh', 'sinh'], ['cosh', 'cosh'], ['tanh', 'tanh'], ['sqrt', 'sqrt'], ['cbrt', 'cbrt'],
  ['abs', 'abs'], ['exp', 'exp'], ['log10', 'log10'], ['log2', 'log2'], ['log', 'log10'],
  ['ln', 'log'], ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'],
];

// Normalize user input: unicode symbols, |x|, implicit multiplication (2x, 2(x-3), (x+1)(x-2))
export function preprocess(raw) {
  let s = String(raw).trim();
  s = s
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[×✕·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[π∏]/g, 'pi')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([0-9.]+|[a-zA-Z])/g, 'sqrt($1)');
  // |...| -> abs(...)
  while (/\|[^|]*\|/.test(s)) s = s.replace(/\|([^|]*)\|/, 'abs($1)');
  // protect function names with letter placeholders
  FUNC_MAP.forEach(([name], i) => {
    s = s.replace(new RegExp(name + '\\s*\\(', 'gi'), `@${String.fromCharCode(65 + i)}@(`);
  });
  // implicit multiplication
  s = s.replace(/(\d)\s*([a-zA-Z@(])/g, '$1*$2');      // 2x, 2(, 2sin(
  s = s.replace(/(\))\s*([a-zA-Z0-9@(])/g, ')*$2');     // )( , )x, )2
  s = s.replace(/([a-zA-Z])\s*\(/g, '$1*(');            // x( -> x*(
  s = s.replace(/([a-zA-Z])\s+([a-zA-Z0-9])/g, '$1*$2'); // 'x y' -> x*y
  // restore functions
  FUNC_MAP.forEach(([, target], i) => {
    s = s.replace(new RegExp(`@${String.fromCharCode(65 + i)}@`, 'g'), target);
  });
  return s;
}

// Best rational approximation via continued fractions; null if none within tolerance
export function approxFrac(x, maxDen = 100000, tol = 1e-9) {
  if (typeof x !== 'number' || !isFinite(x)) return null;
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return math.fraction(x);
  let p0 = 0, q0 = 1, p1 = 1, q1 = 0, b = x;
  for (let i = 0; i < 64; i++) {
    const a = Math.floor(b);
    const p2 = a * p1 + p0, q2 = a * q1 + q0;
    if (q2 > maxDen) break;
    p0 = p1; q0 = q1; p1 = p2; q1 = q2;
    if (q1 !== 0 && Math.abs(x - p1 / q1) < tol * Math.max(1, Math.abs(x))) {
      return math.fraction(p1, q1);
    }
    const r = b - a;
    if (r < 1e-15) break;
    b = 1 / r;
  }
  if (q1 !== 0 && Math.abs(x - p1 / q1) < 1e-9) return math.fraction(p1, q1);
  return null;
}

const isNegFrac = (f) => (typeof f.s === 'bigint' ? f.s < 0n : f.s < 0);

// Fraction -> LaTeX
export function texFrac(f) {
  const neg = isNegFrac(f) ? '-' : '';
  const n = f.n.toString(), d = f.d.toString();
  return d === '1' ? `${neg}${n}` : `${neg}\\frac{${n}}{${d}}`;
}

// Fraction -> plain text like -3/4
export function fracPlain(f) {
  const neg = isNegFrac(f) ? '-' : '';
  const n = f.n.toString(), d = f.d.toString();
  return d === '1' ? `${neg}${n}` : `${neg}${n}/${d}`;
}

export function trimNum(n, digits = 6) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  if (Math.abs(n) >= 1e-4 || n === 0) return Number(n.toFixed(digits)).toString();
  return n.toExponential(4);
}

// Format a value (number or Fraction) as LaTeX, exact fraction unless decimal mode.
// Small denominators only, so irrational values (e, π, √2…) stay decimal.
export function fmtVal(x, decimal = false) {
  if (math.isFraction(x)) {
    return decimal ? trimNum(math.number(x)) : texFrac(x);
  }
  if (!decimal && typeof x === 'number') {
    const f = approxFrac(x, 1000, 1e-12);
    if (f && Math.abs(math.number(f) - x) < 1e-10) return texFrac(f);
  }
  return trimNum(x);
}

// n = k^2 * m  -> { k, m } for simplifying sqrt(n)
export function simplifyRadical(n) {
  n = Math.round(Math.abs(n));
  let k = 1, m = n;
  for (let i = 2; i * i <= m; i++) {
    while (m % (i * i) === 0) { m /= i * i; k *= i; }
  }
  return { k, m };
}

// Parse string -> LaTeX (safe)
export function texExpr(str) {
  try {
    return math.parse(String(str)).toTex({ parenthesis: 'auto', implicit: 'hide' });
  } catch {
    return String(str).replace(/([#$%&_{}])/g, '\\$1');
  }
}

export const containsSymbol = (node, name) => {
  let found = false;
  node.traverse((n) => { if (n.isSymbolNode && n.name === name) found = true; });
  return found;
};

export function getVariables(node) {
  const set = new Set();
  node.traverse((n, path, parent) => {
    if (n.isSymbolNode && !['pi', 'e', 'i', 'tau', 'phi', 'Infinity'].includes(n.name)) {
      if (parent && parent.isFunctionNode && parent.fn === n) return;
      set.add(n.name);
    }
  });
  return [...set];
}

// Format a complex number (mathjs Complex or number) as LaTeX
export function texComplex(z, decimal = false) {
  if (typeof z === 'number') return fmtVal(z, decimal);
  const re = z.re, im = z.im;
  if (Math.abs(im) < 1e-10) return fmtVal(re, decimal);
  const imAbs = Math.abs(im);
  const imTex = Math.abs(imAbs - 1) < 1e-12 ? '' : fmtVal(imAbs, decimal);
  const sign = im < 0 ? '-' : (Math.abs(re) > 1e-12 ? '+' : '');
  if (Math.abs(re) < 1e-12) return `${im < 0 ? '-' : ''}${imTex}i`;
  return `${fmtVal(re, decimal)} ${sign} ${imTex}i`;
}
