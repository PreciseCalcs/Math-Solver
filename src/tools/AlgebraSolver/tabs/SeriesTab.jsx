import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StepsView } from '../components/StepsView';
import { arithmeticSeries, geometricSeries, summation, binomialExpansion } from '../engine/series';
import { useMathHistory } from '../context/HistoryContext';
import { cleanPlainMath } from '../utils/exportUtils';

const MODES = [
  { key: 'arithmetic', label: 'Arithmetic' },
  { key: 'geometric', label: 'Geometric' },
  { key: 'summation', label: 'Σ Summation' },
  { key: 'binomial', label: 'Binomial' },
];

const Field = ({ id, label, value, onChange, placeholder }) => (
  <div className="as-field">
    <label className="as-field-label" htmlFor={id}>{label}</label>
    <input
      id={id}
      className="as-input"
      data-testid={`${id}-input`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      spellCheck={false}
    />
  </div>
);

export const SeriesTab = ({ decimal }) => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'arithmetic';

  const [mode, setMode] = useState(initialMode);
  const [result, setResult] = useState(null);
  const [ar, setAr] = useState({
    a1: searchParams.get('a1') || '2',
    d: searchParams.get('d') || '3',
    n: searchParams.get('n') || '10',
  });
  const [geo, setGeo] = useState({
    a1: searchParams.get('a1') || '3',
    r: searchParams.get('r') || '1/2',
    n: searchParams.get('n') || '8',
  });
  const [sum, setSum] = useState({
    expr: searchParams.get('expr') || 'k^2',
    varName: searchParams.get('varName') || 'k',
    from: searchParams.get('from') || '1',
    to: searchParams.get('to') || '10',
  });
  const [bin, setBin] = useState({
    a: searchParams.get('a') || '2x',
    b: searchParams.get('b') || '-3',
    n: searchParams.get('n') || '4',
  });

  const { addSolvedProblem, recalledProblem } = useMathHistory();

  const compute = (targetMode = mode) => {
    if (targetMode === 'arithmetic') setResult(arithmeticSeries(ar, { decimal }));
    else if (targetMode === 'geometric') setResult(geometricSeries(geo, { decimal }));
    else if (targetMode === 'summation') setResult(summation(sum, { decimal }));
    else setResult(binomialExpansion(bin, { decimal }));
  };

  // Listen for recalled problem from history
  useEffect(() => {
    if (recalledProblem && recalledProblem.tab === 'series' && recalledProblem.payload) {
      const p = recalledProblem.payload;
      const targetMode = p.mode || mode;
      if (p.mode) setMode(p.mode);
      if (p.ar) setAr(p.ar);
      if (p.geo) setGeo(p.geo);
      if (p.sum) setSum(p.sum);
      if (p.bin) setBin(p.bin);

      if (targetMode === 'arithmetic') setResult(arithmeticSeries(p.ar || ar, { decimal }));
      else if (targetMode === 'geometric') setResult(geometricSeries(p.geo || geo, { decimal }));
      else if (targetMode === 'summation') setResult(summation(p.sum || sum, { decimal }));
      else setResult(binomialExpansion(p.bin || bin, { decimal }));
    }
  }, [recalledProblem, decimal]);

  // Save successful solve to history
  useEffect(() => {
    if (result && !result.error) {
      const { title, tex } = getProblemDetails();
      const ans = cleanPlainMath(result.answerTex || '');
      addSolvedProblem({
        tab: 'series',
        title,
        expression: title,
        tex,
        answer: ans,
        answerTex: result.answerTex || '',
        payload: { mode, ar, geo, sum, bin },
      }, { immediate: true });
    }
  }, [result, mode, ar, geo, sum, bin, addSolvedProblem]);

  useEffect(() => {
    if (searchParams.get('mode') || searchParams.get('expr') || searchParams.get('a1')) {
      compute(initialMode);
    }
  }, []);

  const getProblemDetails = () => {
    if (mode === 'arithmetic') {
      return {
        title: `Arithmetic Series (a₁=${ar.a1}, d=${ar.d}, n=${ar.n})`,
        tex: `a_1 = ${ar.a1}, \\quad d = ${ar.d}, \\quad n = ${ar.n}`,
        share: { tab: 'series', mode: 'arithmetic', a1: ar.a1, d: ar.d, n: ar.n },
      };
    }
    if (mode === 'geometric') {
      return {
        title: `Geometric Series (a₁=${geo.a1}, r=${geo.r}, n=${geo.n})`,
        tex: `a_1 = ${geo.a1}, \\quad r = ${geo.r}, \\quad n = ${geo.n}`,
        share: { tab: 'series', mode: 'geometric', a1: geo.a1, r: geo.r, n: geo.n },
      };
    }
    if (mode === 'summation') {
      return {
        title: `Summation Σ ${sum.expr} from ${sum.from} to ${sum.to}`,
        tex: `\\sum_{${sum.varName}=${sum.from}}^{${sum.to}} \\left(${sum.expr}\\right)`,
        share: { tab: 'series', mode: 'summation', expr: sum.expr, varName: sum.varName, from: sum.from, to: sum.to },
      };
    }
    return {
      title: `Binomial Expansion (${bin.a} + ${bin.b})^${bin.n}`,
      tex: `\\left(${bin.a} + (${bin.b})\\right)^{${bin.n}}`,
      share: { tab: 'series', mode: 'binomial', a: bin.a, b: bin.b, n: bin.n },
    };
  };

  const { title: probTitle, tex: probTex, share: probShare } = getProblemDetails();

  return (
    <div className="as-panel" data-testid="series-tab">
      <h2 className="as-panel-title">Sequences, series & binomial expansion</h2>
      <div className="as-pills">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`as-pill ${mode === m.key ? 'active' : ''}`}
            data-testid={`series-mode-${m.key}`}
            onClick={() => { setMode(m.key); setResult(null); }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'arithmetic' && (
        <div className="as-field-grid">
          <Field id="series-a1" label="First term a₁" value={ar.a1} onChange={(v) => setAr({ ...ar, a1: v })} placeholder="2" />
          <Field id="series-d" label="Common difference d" value={ar.d} onChange={(v) => setAr({ ...ar, d: v })} placeholder="3" />
          <Field id="series-n" label="Number of terms n" value={ar.n} onChange={(v) => setAr({ ...ar, n: v })} placeholder="10" />
        </div>
      )}
      {mode === 'geometric' && (
        <div className="as-field-grid">
          <Field id="geo-a1" label="First term a₁" value={geo.a1} onChange={(v) => setGeo({ ...geo, a1: v })} placeholder="3" />
          <Field id="geo-r" label="Common ratio r" value={geo.r} onChange={(v) => setGeo({ ...geo, r: v })} placeholder="1/2" />
          <Field id="geo-n" label="Number of terms n" value={geo.n} onChange={(v) => setGeo({ ...geo, n: v })} placeholder="8" />
        </div>
      )}
      {mode === 'summation' && (
        <div className="as-field-grid">
          <Field id="sum-expr" label="Expression f(k)" value={sum.expr} onChange={(v) => setSum({ ...sum, expr: v })} placeholder="k^2" />
          <Field id="sum-var" label="Index variable" value={sum.varName} onChange={(v) => setSum({ ...sum, varName: v })} placeholder="k" />
          <Field id="sum-from" label="From" value={sum.from} onChange={(v) => setSum({ ...sum, from: v })} placeholder="1" />
          <Field id="sum-to" label="To" value={sum.to} onChange={(v) => setSum({ ...sum, to: v })} placeholder="10" />
        </div>
      )}
      {mode === 'binomial' && (
        <div className="as-field-grid">
          <Field id="bin-a" label="First term a" value={bin.a} onChange={(v) => setBin({ ...bin, a: v })} placeholder="2x" />
          <Field id="bin-b" label="Second term b" value={bin.b} onChange={(v) => setBin({ ...bin, b: v })} placeholder="-3" />
          <Field id="bin-n" label="Exponent n (0–20)" value={bin.n} onChange={(v) => setBin({ ...bin, n: v })} placeholder="4" />
        </div>
      )}
      {mode === 'binomial' && <p className="as-hint">Expands (a + b)ⁿ — e.g. (2x − 3)⁴. Enter the second term with its sign.</p>}

      <button type="button" className="as-solve-btn" data-testid="series-compute-btn" onClick={compute}>
        Compute
      </button>
      <StepsView
        result={result}
        problemTitle={probTitle}
        problemTex={probTex}
        shareParams={{
          ...probShare,
          dec: decimal ? '1' : '0',
        }}
        decimal={decimal}
      />
    </div>
  );
};
