// Complex number arithmetic with steps: rectangular, modulus, argument, polar, conjugate
import { math, preprocess, texExpr, fmtVal, trimNum, approxFrac, texFrac, simplifyRadical, texComplex } from './utils';

function piTex(x) {
  if (Math.abs(x) < 1e-12) return '0';
  const f = approxFrac(x / Math.PI, 24, 1e-9);
  if (!f) return null;
  const neg = math.number(f) < 0 ? '-' : '';
  const n = f.n.toString(), d = f.d.toString();
  if (d === '1') return `${neg}${n === '1' ? '' : n}\\pi`;
  return `${neg}\\frac{${n === '1' ? '' : n}\\pi}{${d}}`;
}

export function solveComplex(raw, opts = {}) {
  const decimal = !!opts.decimal;
  try {
    if (!raw || !String(raw).trim()) return { error: 'Enter a complex expression first, e.g. (3 + 2i)(1 - 4i).' };
    const s = preprocess(raw);
    const steps = [];
    steps.push({ title: 'Parsed expression', desc: '', tex: texExpr(s) });

    let val;
    try { val = math.evaluate(s); } catch (e) { return { error: `Could not evaluate: ${e.message}` }; }
    let re, im;
    if (typeof val === 'number') { re = val; im = 0; }
    else if (val && typeof val.re === 'number') { re = val.re; im = val.im; }
    else return { error: 'The expression did not evaluate to a number. Remove any unknown variables.' };

    if (Math.abs(re - Math.round(re)) < 1e-10) re = Math.round(re);
    if (Math.abs(im - Math.round(im)) < 1e-10) im = Math.round(im);

    const zTex = texComplex(math.complex(re, im), decimal);
    steps.push({
      title: 'Evaluate to rectangular form (a + bi)',
      desc: 'Carry out the complex arithmetic. Remember i² = −1.',
      tex: `z = ${zTex}`,
    });

    if (im === 0) {
      steps.push({ title: 'Result is purely real', desc: 'The imaginary parts cancel out.', tex: `z = ${fmtVal(re, decimal)}` });
      return { steps, answerTex: `z = ${fmtVal(re, decimal)}` };
    }

    // modulus
    const modSq = re * re + im * im;
    const mod = Math.sqrt(modSq);
    let modTex;
    if (Number.isInteger(re) && Number.isInteger(im)) {
      const { k, m } = simplifyRadical(modSq);
      modTex = m === 1 ? `${k}` : `${k === 1 ? '' : k}\\sqrt{${m}}`;
    } else {
      modTex = trimNum(mod);
    }
    steps.push({
      title: 'Modulus',
      desc: '|z| = √(a² + b²) — the distance from the origin in the complex plane.',
      tex: `|z| = \\sqrt{(${fmtVal(re, decimal)})^2 + (${fmtVal(im, decimal)})^2} = ${decimal ? trimNum(mod) : modTex}`,
    });

    // argument
    const arg = Math.atan2(im, re);
    const argPi = piTex(arg);
    const argDeg = (arg * 180) / Math.PI;
    steps.push({
      title: 'Argument',
      desc: 'θ = atan2(b, a) — the angle measured from the positive real axis.',
      tex: `\\arg(z) = ${!decimal && argPi ? argPi : trimNum(arg)} \\text{ rad} \\; (${trimNum(argDeg)}^{\\circ})`,
    });

    // polar + exponential
    const rTex = decimal ? trimNum(mod) : modTex;
    const thTex = !decimal && argPi ? argPi : trimNum(arg);
    steps.push({
      title: 'Polar and exponential forms',
      desc: 'z = r(cos θ + i sin θ) = r·e^{iθ}.',
      tex: `z = ${rTex}\\left(\\cos\\left(${thTex}\\right) + i\\sin\\left(${thTex}\\right)\\right) = ${rTex}\\,e^{i(${thTex})}`,
    });

    // conjugate
    steps.push({
      title: 'Conjugate',
      desc: 'Flip the sign of the imaginary part.',
      tex: `\\bar{z} = ${texComplex(math.complex(re, -im), decimal)}`,
    });

    return {
      steps,
      answerTex: `z = ${zTex}`,
      answerNote: `|z| ≈ ${trimNum(mod)}, arg(z) ≈ ${trimNum(arg)} rad`,
    };
  } catch (e) {
    return { error: `Could not parse the expression. (${e.message})` };
  }
}
