import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { math, preprocess, trimNum } from '../engine/utils.js';
import { MathBlock, MathText } from './MathBlock';
import { toLiveMathTex } from '../engine/liveMath';

/**
 * Robust LaTeX-to-expression sanitization
 * Converts LaTeX math notation (fractions, roots, relations) into mathjs-compatible strings.
 */
export function sanitizeMathInput(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();

  // Remove solve directives like "solve for x" or trailing ", for y"
  s = s.replace(/solve\s+(?:for\s+)?[a-zA-Z]/gi, '')
       .replace(/,\s*(?:for\s+)?[a-zA-Z]\s*$/gi, '')
       .replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^}]*)\}/g, '$1')
       .replace(/\\displaystyle/g, '')
       .replace(/\\quad|\\qquad|\\,|\\;|\\!/g, ' ')
       .replace(/\\left|\\right/g, '')
       .replace(/\$/g, '');

  // Convert relations
  s = s.replace(/\\le(?:q)?\b/g, '<=')
       .replace(/\\ge(?:q)?\b/g, '>=')
       .replace(/\\ne(?:q)?\b/g, '!=')
       .replace(/\\cdot|\\times/g, '*')
       .replace(/\\div/g, '/')
       .replace(/\\pm/g, '+');

  // Fractions: \frac{a}{b} -> ((a)/(b))
  while (/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
  }

  // nthRoot: \sqrt[n]{x} -> nthRoot(x, n)
  while (/\\sqrt\s*\[([^{}]+)\]\s*\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\sqrt\s*\[([^{}]+)\]\s*\{([^{}]+)\}/g, 'nthRoot($2, $1)');
  }
  // Square root: \sqrt{x} -> sqrt(x)
  while (/\\sqrt\s*\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');
  }

  // Exponents with braces: ^{2} -> ^(2)
  s = s.replace(/\^\s*\{([^{}]+)\}/g, '^($1)');

  // Mathematical functions
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|asin|acos|atan|ln|log|exp|abs)/g, '$1');
  s = s.replace(/\\pi/g, 'pi');

  // Strip remaining backslashes
  s = s.replace(/\\/g, '');

  return s.trim();
}

/**
 * Detect the primary independent variable from an expression
 */
function detectVariable(str, fallback = 'x') {
  if (!str) return fallback;
  const cleaned = str.replace(/\b(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|asin|acos|atan|ln|log|exp|abs|sqrt|cbrt|pi)\b/gi, '');
  const matches = cleaned.match(/[a-zA-Z]/g);
  if (!matches) return fallback;
  // If only one unique letter, return it
  const unique = Array.from(new Set(matches.filter((c) => c !== 'e' && c !== 'i')));
  if (unique.length === 1) return unique[0];
  if (unique.includes('x')) return 'x';
  if (unique.includes('t')) return 't';
  if (unique.includes('n')) return 'n';
  return unique[0] || fallback;
}

/**
 * For a linear expression in x and y (ax + by = c), isolate y: y = (c - ax) / b
 * Returns { isVertical, xVal, slope, intercept, fn } or null
 */
function isolateLinearY(eqStr) {
  try {
    if (!eqStr.includes('=')) return null;
    const [leftRaw, rightRaw] = eqStr.split('=');
    const L = preprocess(leftRaw);
    const R = preprocess(rightRaw);
    const diffStr = `(${L}) - (${R})`;
    const diffNode = math.parse(diffStr);
    const compiled = diffNode.compile();

    // Evaluate E(0, 0) -> constant
    const e00 = compiled.evaluate({ x: 0, y: 0 });
    // Evaluate E(0, 1) -> constant + b
    const e01 = compiled.evaluate({ x: 0, y: 1 });
    const b = e01 - e00;

    // Evaluate E(1, 0) -> constant + a
    const e10 = compiled.evaluate({ x: 1, y: 0 });
    const a = e10 - e00;

    if (Math.abs(b) < 1e-9) {
      // Vertical line: ax + e00 = 0 -> x = -e00 / a
      if (Math.abs(a) < 1e-9) return null;
      const xVal = -e00 / a;
      return { isVertical: true, xVal, slope: null, intercept: null, fn: null };
    }

    // y = (-a/b)*x + (-e00/b)
    const slope = -a / b;
    const intercept = -e00 / b;
    const fn = math.compile(`(${intercept}) + (${slope}) * x`);
    return { isVertical: false, xVal: null, slope, intercept, fn };
  } catch {
    return null;
  }
}

/**
 * Interactive Coordinate Plane Component
 * Visualizes algebraic equations, systems of equations, inequalities, and functions.
 */
export const CoordinatePlane = ({
  rawInput = '',
  result = null,
  variable = 'x',
  defaultHeight = 420,
  problemTitle = '',
  problemTex = '',
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Active independent variable
  const activeVar = useMemo(() => {
    if (result?.variable) return result.variable;
    if (variable && variable !== 'x') return variable;
    return detectVariable(rawInput || problemTitle, 'x');
  }, [result, variable, rawInput, problemTitle]);

  // Container dimensions tracked via ResizeObserver
  const [dimensions, setDimensions] = useState({ width: 680, height: defaultHeight });

  // Viewport bounds in mathematical coordinates
  const [viewport, setViewport] = useState({
    xMin: -8,
    xMax: 8,
    yMin: -6,
    yMax: 6,
  });

  // Display toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showShading, setShowShading] = useState(true);
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'dual', 'single'
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lockAspect, setLockAspect] = useState(true); // 1:1 square grid by default

  // Mouse drag state for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartViewport, setDragStartViewport] = useState(null);

  // Touch drag & pinch state
  const touchStateRef = useRef({ lastDist: null, startCenter: null, startViewport: null });

  // Hover coordinates in math space
  const [hoverCoord, setHoverCoord] = useState(null);
  const [hoverPointInfo, setHoverPointInfo] = useState(null);

  // ResizeObserver on canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Parse equation / inequality / system
  const parsedInfo = useMemo(() => {
    const inputStr = rawInput || problemTitle || '';
    if (!inputStr || typeof inputStr !== 'string' || !inputStr.trim()) {
      return null;
    }

    try {
      const sanitized = sanitizeMathInput(inputStr);

      // ---------------------------------------------------------------
      // Check for 2-Equation System
      // ---------------------------------------------------------------
      const hasPlottableSystem = Boolean(result?.plottableSystem?.eq1 && result?.plottableSystem?.eq2);
      const splitByEqs = sanitized.split(/[;\n]|,\s*(?=[a-zA-Z0-9])/).map((s) => s.trim()).filter(Boolean);
      const isSystemInput = hasPlottableSystem || (splitByEqs.length === 2 && splitByEqs.every((s) => s.includes('=')));

      if (isSystemInput) {
        const eq1Raw = result?.plottableSystem?.eq1 || splitByEqs[0];
        const eq2Raw = result?.plottableSystem?.eq2 || splitByEqs[1];

        const line1 = isolateLinearY(sanitizeMathInput(eq1Raw));
        const line2 = isolateLinearY(sanitizeMathInput(eq2Raw));

        return {
          type: 'system',
          raw: `${eq1Raw}, ${eq2Raw}`,
          eq1: eq1Raw,
          eq2: eq2Raw,
          line1,
          line2,
        };
      }

      const s = preprocess(sanitized);

      // ---------------------------------------------------------------
      // Check for Inequality (<=, >=, <, >)
      // ---------------------------------------------------------------
      const ineqMatch = s.match(/(<=|>=|<|>)/);
      if (ineqMatch) {
        const op = ineqMatch[1];
        const [L, R] = s.split(op);
        const exprStr = `(${L}) - (${R})`;

        let testFn = null;
        try { testFn = math.compile(`(${L}) ${op} (${R})`); } catch {}

        let diffFn = null;
        try { diffFn = math.compile(exprStr); } catch {}

        let lhsFn = null;
        try { lhsFn = math.compile(L); } catch {}
        let rhsFn = null;
        try { rhsFn = math.compile(R); } catch {}

        const opFunc = {
          '<=': (l, r) => l <= r,
          '>=': (l, r) => l >= r,
          '<': (l, r) => l < r,
          '>': (l, r) => l > r,
        }[op] || ((l, r) => l <= r);

        // Check if 2D inequality with y
        const hasY = L.includes('y') || R.includes('y');
        let boundaryFn = null;
        if (hasY) {
          // If in form y <= f(x) or y >= f(x)
          if (L.trim() === 'y') {
            boundaryFn = rhsFn;
          } else if (R.trim() === 'y') {
            boundaryFn = lhsFn;
          } else {
            const linearY = isolateLinearY(`${L} = ${R}`);
            if (linearY && !linearY.isVertical) {
              boundaryFn = linearY.fn;
            }
          }
        }

        return {
          type: 'inequality',
          op,
          opFunc,
          raw: s,
          L,
          R,
          hasY,
          boundaryFn,
          testFn,
          diffFn,
          lhsFn,
          rhsFn,
          isStrict: op === '<' || op === '>',
        };
      }

      // ---------------------------------------------------------------
      // Check for 2D Equation with y (e.g. 2x + 3y = 6 or y = 2x - 1)
      // ---------------------------------------------------------------
      if (s.includes('=') && s.includes('y') && activeVar === 'x') {
        const linearY = isolateLinearY(s);
        if (linearY) {
          return {
            type: 'equation2d',
            raw: s,
            linearY,
          };
        }
      }

      // ---------------------------------------------------------------
      // Standard Single-Variable Equality
      // ---------------------------------------------------------------
      if (s.includes('=')) {
        const parts = s.split('=');
        if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
          const L = parts[0].trim();
          const R = parts[1].trim();
          const exprStr = `(${L}) - (${R})`;

          let lhsFn = null;
          try { lhsFn = math.compile(L); } catch {}

          let rhsFn = null;
          try { rhsFn = math.compile(R); } catch {}

          let diffFn = null;
          try { diffFn = math.compile(exprStr); } catch {}

          const isRhsZero = R === '0' || R === '0.0';

          return {
            type: 'equation',
            raw: s,
            L,
            R,
            isRhsZero,
            lhsFn,
            rhsFn,
            diffFn,
          };
        }
      }

      // ---------------------------------------------------------------
      // Standalone Expression: y = f(x)
      // ---------------------------------------------------------------
      let exprFn = null;
      try { exprFn = math.compile(s); } catch {}

      return {
        type: 'expression',
        raw: s,
        exprFn,
        diffFn: exprFn,
      };
    } catch {
      return null;
    }
  }, [rawInput, problemTitle, result, activeVar]);

  // Safe evaluation wrapper for a compiled mathjs function
  const safeEval = useCallback(
    (fn, xVal) => {
      if (!fn) return null;
      try {
        const val = fn.evaluate({ [activeVar]: xVal, x: xVal });
        if (typeof val === 'number' && isFinite(val)) return val;
        if (val && typeof val.re === 'number' && isFinite(val.re) && Math.abs(val.im || 0) < 1e-9) {
          return val.re;
        }
        return null;
      } catch {
        return null;
      }
    },
    [activeVar]
  );

  // Extract numerical roots and key points (intercepts, vertex, intersection)
  const keyPoints = useMemo(() => {
    const pts = [];
    if (!parsedInfo) return pts;

    const v = activeVar || 'x';

    // -----------------------------------------------------------------
    // A. 2-Equation System Intersections
    // -----------------------------------------------------------------
    if (parsedInfo.type === 'system') {
      if (result?.answers && Array.isArray(result.answers)) {
        result.answers.forEach((ans) => {
          if (typeof ans.num === 'number' && isFinite(ans.num) && typeof ans.pairNum === 'number' && isFinite(ans.pairNum)) {
            pts.push({
              x: ans.num,
              y: ans.pairNum,
              label: `Intersection: (${trimNum(ans.num)}, ${trimNum(ans.pairNum)})`,
              type: 'intersection',
              color: '#c8522a',
            });
          }
        });
      }
      return pts;
    }

    // -----------------------------------------------------------------
    // B. Roots & Intersections from Result Answers
    // -----------------------------------------------------------------
    if (result?.answers && Array.isArray(result.answers)) {
      result.answers.forEach((ans) => {
        // If coordinate pair is already provided (e.g. non-linear system)
        if (typeof ans.num === 'number' && isFinite(ans.num) && typeof ans.pairNum === 'number' && isFinite(ans.pairNum)) {
          pts.push({
            x: ans.num,
            y: ans.pairNum,
            label: `Intersection: (${trimNum(ans.num)}, ${trimNum(ans.pairNum)})`,
            type: 'intersection',
            color: '#c8522a',
          });
          return;
        }

        const rVal = ans.num;
        if (typeof rVal !== 'number' || !isFinite(rVal)) return;

        let yVal = 0;
        let label = `Root: ${v} = ${trimNum(rVal)}`;

        const isDual =
          parsedInfo.type === 'equation' &&
          !parsedInfo.isRhsZero &&
          viewMode !== 'single' &&
          parsedInfo.lhsFn;

        if (isDual) {
          const evalY = safeEval(parsedInfo.lhsFn, rVal);
          if (evalY !== null) {
            yVal = evalY;
            label = `Intersection: (${trimNum(rVal)}, ${trimNum(yVal)})`;
          }
        }

        if (!pts.some((p) => Math.abs(p.x - rVal) < 1e-4 && Math.abs(p.y - yVal) < 1e-4)) {
          pts.push({
            x: rVal,
            y: yVal,
            label,
            type: isDual ? 'intersection' : 'root',
            color: '#c8522a',
          });
        }
      });
    }

    // -----------------------------------------------------------------
    // C. Y-intercept (x = 0)
    // -----------------------------------------------------------------
    const isDual =
      parsedInfo.type === 'equation' &&
      !parsedInfo.isRhsZero &&
      viewMode !== 'single';

    if (isDual) {
      if (parsedInfo.lhsFn) {
        const yL = safeEval(parsedInfo.lhsFn, 0);
        if (yL !== null) {
          pts.push({
            x: 0,
            y: yL,
            label: `y₁-intercept: (0, ${trimNum(yL)})`,
            type: 'intercept',
            color: '#4f46e5',
          });
        }
      }
      if (parsedInfo.rhsFn) {
        const yR = safeEval(parsedInfo.rhsFn, 0);
        if (yR !== null) {
          pts.push({
            x: 0,
            y: yR,
            label: `y₂-intercept: (0, ${trimNum(yR)})`,
            type: 'intercept',
            color: '#0d9488',
          });
        }
      }
    } else {
      const activeFn =
        parsedInfo.type === 'equation2d' && parsedInfo.linearY?.fn
          ? parsedInfo.linearY.fn
          : parsedInfo.diffFn || parsedInfo.exprFn || parsedInfo.lhsFn;

      if (activeFn) {
        const y0 = safeEval(activeFn, 0);
        if (y0 !== null) {
          if (!pts.some((p) => Math.abs(p.x) < 1e-4 && Math.abs(p.y - y0) < 1e-4)) {
            pts.push({
              x: 0,
              y: y0,
              label: `Y-intercept: (0, ${trimNum(y0)})`,
              type: 'intercept',
              color: '#0d9488',
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // D. Quadratic Parabola Vertex Detection
    // -----------------------------------------------------------------
    const singleFn = parsedInfo.diffFn || parsedInfo.exprFn;
    if (singleFn && viewMode === 'single' || (parsedInfo.isRhsZero && singleFn)) {
      const y0 = safeEval(singleFn, 0);
      const y1 = safeEval(singleFn, 1);
      const yNeg1 = safeEval(singleFn, -1);
      const y2 = safeEval(singleFn, 2);

      if (y0 !== null && y1 !== null && yNeg1 !== null && y2 !== null) {
        const a = (y1 + yNeg1 - 2 * y0) / 2;
        const b = (y1 - yNeg1) / 2;
        const c = y0;

        // Check if truly quadratic: f(2) should equal 4a + 2b + c
        if (Math.abs(a) > 1e-4 && Math.abs(y2 - (4 * a + 2 * b + c)) < 1e-4) {
          const xv = -b / (2 * a);
          const yv = safeEval(singleFn, xv);
          if (yv !== null && isFinite(yv)) {
            if (!pts.some((p) => Math.abs(p.x - xv) < 1e-4 && Math.abs(p.y - yv) < 1e-4)) {
              pts.push({
                x: xv,
                y: yv,
                label: `Vertex: (${trimNum(xv)}, ${trimNum(yv)})`,
                type: 'vertex',
                color: '#8b5cf6',
              });
            }
          }
        }
      }
    }

    return pts;
  }, [result, parsedInfo, activeVar, viewMode, safeEval]);

  // Adjust aspect ratio so math units are square (1:1 scale)
  const adjustViewportForAspect = useCallback((vp, width, height) => {
    if (!width || !height) return vp;
    const aspect = width / height;
    const spanX = vp.xMax - vp.xMin;
    const requiredSpanY = spanX / aspect;
    const midY = (vp.yMin + vp.yMax) / 2;

    return {
      ...vp,
      yMin: midY - requiredSpanY / 2,
      yMax: midY + requiredSpanY / 2,
    };
  }, []);

  // Auto-fit initial viewport when new problem or keypoints load
  useEffect(() => {
    const { width, height } = dimensions;

    if (!keyPoints.length) {
      const standard = { xMin: -8, xMax: 8, yMin: -6, yMax: 6 };
      setViewport(lockAspect ? adjustViewportForAspect(standard, width, height) : standard);
      return;
    }

    let minX = Math.min(0, ...keyPoints.map((p) => p.x));
    let maxX = Math.max(0, ...keyPoints.map((p) => p.x));
    let minY = Math.min(0, ...keyPoints.map((p) => p.y));
    let maxY = Math.max(0, ...keyPoints.map((p) => p.y));

    // Pad margins around points
    const spanX = Math.max(maxX - minX, 6);
    const spanY = Math.max(maxY - minY, 6);

    const padX = Math.max(spanX * 0.35, 2.5);
    const padY = Math.max(spanY * 0.35, 2.5);

    const fitted = {
      xMin: Math.floor(minX - padX),
      xMax: Math.ceil(maxX + padX),
      yMin: Math.floor(minY - padY),
      yMax: Math.ceil(maxY + padY),
    };

    setViewport(lockAspect ? adjustViewportForAspect(fitted, width, height) : fitted);
  }, [keyPoints, lockAspect, dimensions.width, dimensions.height, adjustViewportForAspect]);

  // Coordinate conversion helpers
  const toScreenX = useCallback(
    (mathX, width) => {
      const { xMin, xMax } = viewport;
      return ((mathX - xMin) / (xMax - xMin)) * width;
    },
    [viewport]
  );

  const toScreenY = useCallback(
    (mathY, height) => {
      const { yMin, yMax } = viewport;
      return height - ((mathY - yMin) / (yMax - yMin)) * height;
    },
    [viewport]
  );

  const toMathX = useCallback(
    (screenX, width) => {
      const { xMin, xMax } = viewport;
      return xMin + (screenX / width) * (xMax - xMin);
    },
    [viewport]
  );

  const toMathY = useCallback(
    (screenY, height) => {
      const { yMin, yMax } = viewport;
      return yMax - (screenY / height) * (yMax - yMin);
    },
    [viewport]
  );

  // Compute clean grid step intervals
  const getGridStep = (span) => {
    const rough = span / 10;
    const power = Math.pow(10, Math.floor(Math.log10(rough)));
    const frac = rough / power;
    if (frac <= 1.5) return 1 * power;
    if (frac <= 3.5) return 2 * power;
    if (frac <= 7.5) return 5 * power;
    return 10 * power;
  };

  // Render canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedInfo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = dimensions.width;
    const height = dimensions.height;

    if (width <= 0 || height <= 0) return;

    // Retina DPI scale
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, width, height);

    const { xMin, xMax, yMin, yMax } = viewport;
    const spanX = xMax - xMin;
    const spanY = yMax - yMin;

    const xStep = getGridStep(spanX);
    const yStep = getGridStep(spanY);

    // -------------------------------------------------------------
    // 1. Shaded Inequality Region
    // -------------------------------------------------------------
    if (parsedInfo.type === 'inequality' && showShading) {
      ctx.save();
      const { testFn, lhsFn, rhsFn, opFunc, isStrict, hasY, boundaryFn, op } = parsedInfo;

      if (hasY && boundaryFn) {
        // 2D half-plane shading (e.g. y <= 2x + 1 or y >= x^2)
        const isBelow = op === '<=' || op === '<';
        const numSamples = Math.min(width, 600);
        ctx.fillStyle = 'rgba(200, 82, 42, 0.12)';

        for (let i = 0; i <= numSamples; i++) {
          const sx = (i / numSamples) * width;
          const mx = toMathX(sx, width);
          const my = safeEval(boundaryFn, mx);
          if (my !== null && isFinite(my)) {
            const sy = toScreenY(my, height);
            if (isBelow) {
              // Fill from sy to bottom of canvas
              const topY = Math.max(0, sy);
              const fillH = Math.max(0, height - topY);
              ctx.fillRect(sx, topY, width / numSamples + 1, fillH);
            } else {
              // Fill from sy to top of canvas
              const botY = Math.min(height, sy);
              ctx.fillRect(sx, 0, width / numSamples + 1, botY);
            }
          }
        }
      } else {
        // 1D vertical interval strip shading
        const evalIneqAtX = (valX) => {
          if (lhsFn && rhsFn && opFunc) {
            const lVal = safeEval(lhsFn, valX);
            const rVal = safeEval(rhsFn, valX);
            if (lVal !== null && rVal !== null) {
              return !!opFunc(lVal, rVal);
            }
          }
          if (testFn) {
            try {
              return !!testFn.evaluate({ [activeVar]: valX, x: valX });
            } catch {}
          }
          return false;
        };

        const sampleCount = Math.min(Math.round(width / 2), 400);
        const dx = width / sampleCount;

        ctx.fillStyle = 'rgba(200, 82, 42, 0.14)';
        for (let i = 0; i < sampleCount; i++) {
          const sX = i * dx;
          const mX = toMathX(sX + dx / 2, width);
          if (evalIneqAtX(mX)) {
            ctx.fillRect(sX, 0, dx + 0.5, height);
          }
        }

        // Highlighted interval bar on the X-axis
        const axisY = toScreenY(0, height);
        if (axisY >= 0 && axisY <= height) {
          ctx.fillStyle = 'rgba(200, 82, 42, 0.75)';
          for (let i = 0; i < sampleCount; i++) {
            const sX = i * dx;
            const mX = toMathX(sX + dx / 2, width);
            if (evalIneqAtX(mX)) {
              ctx.fillRect(sX, axisY - 3, dx + 0.5, 6);
            }
          }

          // Boundary root endpoints with textbook open/closed circles
          keyPoints.forEach((pt) => {
            if (pt.type === 'root') {
              const bx = toScreenX(pt.x, width);
              ctx.save();
              ctx.beginPath();
              ctx.arc(bx, axisY, 5, 0, 2 * Math.PI);
              if (isStrict) {
                // Open circle for <, >
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#c8522a';
                ctx.stroke();
              } else {
                // Solid circle for <=, >=
                ctx.fillStyle = '#c8522a';
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
              }
              ctx.restore();
            }
          });
        }

        // Vertical boundary line(s)
        if (keyPoints && keyPoints.length > 0) {
          ctx.save();
          ctx.lineWidth = 1.75;
          ctx.strokeStyle = '#c8522a';
          if (isStrict) {
            ctx.setLineDash([6, 4]); // Dashed for strict
          } else {
            ctx.setLineDash([]);
          }

          keyPoints.forEach((pt) => {
            if (pt.type === 'root') {
              const bx = toScreenX(pt.x, width);
              ctx.beginPath();
              ctx.moveTo(bx, 0);
              ctx.lineTo(bx, height);
              ctx.stroke();
            }
          });
          ctx.restore();
        }
      }

      ctx.restore();
    }

    // -------------------------------------------------------------
    // 2. Coordinate Grid Lines & Numbers
    // -------------------------------------------------------------
    if (showGrid) {
      ctx.save();
      ctx.lineWidth = 1;

      // Vertical grid lines
      const firstX = Math.floor(xMin / xStep) * xStep;
      for (let x = firstX; x <= xMax; x += xStep) {
        const sx = toScreenX(x, width);
        ctx.strokeStyle = Math.abs(x) < 1e-6 ? '#8c7e72' : '#ebdcd0';
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();

        // Tick number
        if (Math.abs(x) > 1e-6) {
          ctx.fillStyle = '#8c7e72';
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          const yPos = Math.min(Math.max(toScreenY(0, height) + 14, 14), height - 4);
          ctx.fillText(trimNum(x), sx, yPos);
        }
      }

      // Horizontal grid lines
      const firstY = Math.floor(yMin / yStep) * yStep;
      for (let y = firstY; y <= yMax; y += yStep) {
        const sy = toScreenY(y, height);
        ctx.strokeStyle = Math.abs(y) < 1e-6 ? '#8c7e72' : '#ebdcd0';
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        // Tick number
        if (Math.abs(y) > 1e-6) {
          ctx.fillStyle = '#8c7e72';
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'right';
          const xPos = Math.min(Math.max(toScreenX(0, width) - 6, 26), width - 4);
          ctx.fillText(trimNum(y), xPos, sy + 3);
        }
      }

      ctx.restore();
    }

    // -------------------------------------------------------------
    // 3. Main Axes & Labels
    // -------------------------------------------------------------
    ctx.save();
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = '#5a4b3f';

    const originX = toScreenX(0, width);
    const originY = toScreenY(0, height);

    // X Axis
    if (originY >= 0 && originY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();
    }

    // Y Axis
    if (originX >= 0 && originX <= width) {
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();
    }

    // Origin label (0,0)
    ctx.fillStyle = '#5a4b3f';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    if (originX >= 10 && originX <= width - 10 && originY >= 10 && originY <= height - 10) {
      ctx.fillText('O', originX - 4, originY + 12);
    }

    // Axis Variable Names
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#5a4b3f';
    ctx.textAlign = 'right';
    ctx.fillText(activeVar, width - 8, Math.min(Math.max(originY - 6, 14), height - 8));
    ctx.textAlign = 'left';
    ctx.fillText('y', Math.min(Math.max(originX + 8, 8), width - 16), 14);

    ctx.restore();

    // -------------------------------------------------------------
    // 4. Function Curves & Lines Plotting
    // -------------------------------------------------------------
    const plotCurve = (fn, color, isDashed = false, strokeWidth = 2.5) => {
      if (!fn) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      if (isDashed) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      const numSamples = Math.min(Math.round(width * 2.5), 1400);
      let isDrawing = false;
      let prevY = null;
      let prevMy = null;

      for (let i = 0; i <= numSamples; i++) {
        const sx = (i / numSamples) * width;
        const mx = toMathX(sx, width);
        const my = safeEval(fn, mx);

        if (my === null || !isFinite(my)) {
          isDrawing = false;
          prevY = null;
          prevMy = null;
          continue;
        }

        const sy = toScreenY(my, height);

        // Detect vertical asymptotic jumps (e.g. 1/x, tan(x))
        if (isDrawing && prevY !== null && prevMy !== null) {
          const isPoleJump =
            (Math.sign(my) !== Math.sign(prevMy) && Math.abs(my - prevMy) > spanY * 0.4) ||
            (Math.abs(sy - prevY) > height * 0.5 && (sy < -20 || sy > height + 20 || prevY < -20 || prevY > height + 20));

          if (isPoleJump) {
            isDrawing = false;
            prevY = null;
            prevMy = null;
            continue;
          }
        }

        if (!isDrawing) {
          ctx.moveTo(sx, sy);
          isDrawing = true;
        } else {
          ctx.lineTo(sx, sy);
        }
        prevY = sy;
        prevMy = my;
      }

      ctx.stroke();
      ctx.restore();
    };

    // Plot vertical line
    const plotVerticalLine = (xVal, color, isDashed = false, strokeWidth = 2.5) => {
      const sx = toScreenX(xVal, width);
      if (sx < -10 || sx > width + 10) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      if (isDashed) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
      ctx.restore();
    };

    // Plot curves according to equation type
    if (parsedInfo.type === 'system') {
      // Plot Line 1 (Indigo)
      if (parsedInfo.line1) {
        if (parsedInfo.line1.isVertical) {
          plotVerticalLine(parsedInfo.line1.xVal, '#4f46e5', false, 2.5);
        } else {
          plotCurve(parsedInfo.line1.fn, '#4f46e5', false, 2.5);
        }
      }
      // Plot Line 2 (Teal)
      if (parsedInfo.line2) {
        if (parsedInfo.line2.isVertical) {
          plotVerticalLine(parsedInfo.line2.xVal, '#0d9488', false, 2.5);
        } else {
          plotCurve(parsedInfo.line2.fn, '#0d9488', false, 2.5);
        }
      }
    } else if (parsedInfo.type === 'equation2d') {
      if (parsedInfo.linearY?.isVertical) {
        plotVerticalLine(parsedInfo.linearY.xVal, '#c8522a', false, 2.5);
      } else if (parsedInfo.linearY?.fn) {
        plotCurve(parsedInfo.linearY.fn, '#c8522a', false, 2.5);
      }
    } else {
      const isDual =
        viewMode === 'dual' ||
        (viewMode === 'auto' &&
          parsedInfo.type === 'equation' &&
          !parsedInfo.isRhsZero &&
          parsedInfo.lhsFn &&
          parsedInfo.rhsFn);

      if (isDual) {
        // Plot LHS curve (Indigo #4f46e5)
        plotCurve(parsedInfo.lhsFn, '#4f46e5', false, 2.5);
        // Plot RHS curve (Emerald #0d9488)
        plotCurve(parsedInfo.rhsFn, '#0d9488', false, 2.5);
      } else {
        // Single curve: LHS - RHS or expression
        const targetFn =
          parsedInfo.type === 'inequality' && parsedInfo.boundaryFn
            ? parsedInfo.boundaryFn
            : parsedInfo.diffFn || parsedInfo.exprFn || parsedInfo.lhsFn;
        plotCurve(targetFn, '#c8522a', parsedInfo.isStrict, 2.5);
      }
    }

    // -------------------------------------------------------------
    // 5. Solution Roots, Intersections, & Key Points Markers
    // -------------------------------------------------------------
    if (showPoints && keyPoints.length > 0) {
      keyPoints.forEach((pt) => {
        const sx = toScreenX(pt.x, width);
        const sy = toScreenY(pt.y, height);

        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return;

        ctx.save();
        // Glow ring
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
        const glowColor =
          pt.color === '#0d9488'
            ? 'rgba(13, 148, 136, 0.25)'
            : pt.color === '#8b5cf6'
            ? 'rgba(139, 92, 246, 0.25)'
            : 'rgba(200, 82, 42, 0.25)';
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Inner solid dot
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = pt.color || '#c8522a';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label tooltip badge
        ctx.fillStyle = '#2b2118';
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';

        const prefix = pt.type === 'vertex' ? 'V: ' : pt.type === 'intersection' ? 'I: ' : '';
        const labelText = `${prefix}(${trimNum(pt.x)}, ${trimNum(pt.y)})`;
        const metrics = ctx.measureText(labelText);
        const pad = 4;
        const boxW = metrics.width + pad * 2;
        const boxH = 16;
        const boxY = sy - 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = '#d6c5b6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(sx - boxW / 2, boxY, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#2b2118';
        ctx.fillText(labelText, sx, boxY + 11);

        ctx.restore();
      });
    }

    // -------------------------------------------------------------
    // 6. Interactive Crosshair
    // -------------------------------------------------------------
    if (showCrosshair && hoverCoord) {
      const hx = toScreenX(hoverCoord.x, width);
      const hy = toScreenY(hoverCoord.y, height);

      ctx.save();
      ctx.strokeStyle = 'rgba(140, 126, 114, 0.6)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(width, hy);
      ctx.stroke();

      ctx.restore();
    }
  }, [
    viewport,
    showGrid,
    showPoints,
    showShading,
    viewMode,
    showCrosshair,
    hoverCoord,
    parsedInfo,
    keyPoints,
    dimensions,
    activeVar,
    toScreenX,
    toScreenY,
    toMathX,
    toMathY,
    safeEval,
  ]);

  // Mouse wheel zoom (centered on cursor)
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    const mouseMathX = toMathX(mouseScreenX, rect.width);
    const mouseMathY = toMathY(mouseScreenY, rect.height);

    const zoomFactor = e.deltaY < 0 ? 0.85 : 1.18;

    setViewport((prev) => {
      const spanX = (prev.xMax - prev.xMin) * zoomFactor;
      let spanY = (prev.yMax - prev.yMin) * zoomFactor;

      if (lockAspect) {
        spanY = spanX / (rect.width / rect.height);
      }

      const fracX = mouseScreenX / rect.width;
      const fracY = (rect.height - mouseScreenY) / rect.height;

      return {
        xMin: mouseMathX - spanX * fracX,
        xMax: mouseMathX + spanX * (1 - fracX),
        yMin: mouseMathY - spanY * fracY,
        yMax: mouseMathY + spanY * (1 - fracY),
      };
    });
  };

  // Mouse drag handling (Pan)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartViewport({ ...viewport });
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const mathX = toMathX(screenX, rect.width);
    const mathY = toMathY(screenY, rect.height);

    setHoverCoord({ x: mathX, y: mathY });

    // Check if hovering near a key point
    const thresholdDist = 14; // screen px
    const hit = keyPoints.find((p) => {
      const px = toScreenX(p.x, rect.width);
      const py = toScreenY(p.y, rect.height);
      const dist = Math.hypot(screenX - px, screenY - py);
      return dist <= thresholdDist;
    });
    setHoverPointInfo(hit || null);

    if (isDragging && dragStartViewport) {
      const dxScreen = e.clientX - dragStart.x;
      const dyScreen = e.clientY - dragStart.y;

      const spanX = dragStartViewport.xMax - dragStartViewport.xMin;
      const spanY = dragStartViewport.yMax - dragStartViewport.yMin;

      const dxMath = (dxScreen / rect.width) * spanX;
      const dyMath = (dyScreen / rect.height) * spanY;

      setViewport({
        xMin: dragStartViewport.xMin - dxMath,
        xMax: dragStartViewport.xMax - dxMath,
        yMin: dragStartViewport.yMin + dyMath,
        yMax: dragStartViewport.yMax + dyMath,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartViewport(null);
  };

  // Touch handlers for mobile pan & pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragStartViewport({ ...viewport });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStateRef.current = {
        lastDist: dist,
        startCenter: { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 },
        startViewport: { ...viewport },
      };
    }
  };

  const handleTouchMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1 && isDragging && dragStartViewport) {
      const touch = e.touches[0];
      const dxScreen = touch.clientX - dragStart.x;
      const dyScreen = touch.clientY - dragStart.y;

      const spanX = dragStartViewport.xMax - dragStartViewport.xMin;
      const spanY = dragStartViewport.yMax - dragStartViewport.yMin;

      setViewport({
        xMin: dragStartViewport.xMin - (dxScreen / rect.width) * spanX,
        xMax: dragStartViewport.xMax - (dxScreen / rect.width) * spanX,
        yMin: dragStartViewport.yMin + (dyScreen / rect.height) * spanY,
        yMax: dragStartViewport.yMax + (dyScreen / rect.height) * spanY,
      });
    } else if (e.touches.length === 2 && touchStateRef.current.lastDist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = touchStateRef.current.lastDist / dist;

      const centerScreenX = touchStateRef.current.startCenter.x - rect.left;
      const centerScreenY = touchStateRef.current.startCenter.y - rect.top;

      const mathCenterX = toMathX(centerScreenX, rect.width);
      const mathCenterY = toMathY(centerScreenY, rect.height);

      const sv = touchStateRef.current.startViewport;
      const spanX = (sv.xMax - sv.xMin) * ratio;
      let spanY = (sv.yMax - sv.yMin) * ratio;
      if (lockAspect) spanY = spanX / (rect.width / rect.height);

      setViewport({
        xMin: mathCenterX - spanX * 0.5,
        xMax: mathCenterX + spanX * 0.5,
        yMin: mathCenterY - spanY * 0.5,
        yMax: mathCenterY + spanY * 0.5,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragStartViewport(null);
    touchStateRef.current = { lastDist: null, startCenter: null, startViewport: null };
  };

  // Zoom buttons
  const handleZoom = (factor) => {
    setViewport((prev) => {
      const midX = (prev.xMin + prev.xMax) / 2;
      const midY = (prev.yMin + prev.yMax) / 2;
      const halfSpanX = ((prev.xMax - prev.xMin) * factor) / 2;
      let halfSpanY = ((prev.yMax - prev.yMin) * factor) / 2;

      if (lockAspect && dimensions.width > 0 && dimensions.height > 0) {
        halfSpanY = halfSpanX / (dimensions.width / dimensions.height);
      }

      return {
        xMin: midX - halfSpanX,
        xMax: midX + halfSpanX,
        yMin: midY - halfSpanY,
        yMax: midY + halfSpanY,
      };
    });
  };

  // Reset view to fit keypoints or standard range
  const handleResetView = () => {
    const { width, height } = dimensions;

    if (keyPoints.length > 0) {
      let minX = Math.min(0, ...keyPoints.map((p) => p.x));
      let maxX = Math.max(0, ...keyPoints.map((p) => p.x));
      let minY = Math.min(0, ...keyPoints.map((p) => p.y));
      let maxY = Math.max(0, ...keyPoints.map((p) => p.y));

      const spanX = Math.max(maxX - minX, 6);
      const spanY = Math.max(maxY - minY, 6);

      const padX = Math.max(spanX * 0.35, 2.5);
      const padY = Math.max(spanY * 0.35, 2.5);

      const fitted = {
        xMin: Math.floor(minX - padX),
        xMax: Math.ceil(maxX + padX),
        yMin: Math.floor(minY - padY),
        yMax: Math.ceil(maxY + padY),
      };

      setViewport(lockAspect ? adjustViewportForAspect(fitted, width, height) : fitted);
    } else {
      const standard = { xMin: -8, xMax: 8, yMin: -6, yMax: 6 };
      setViewport(lockAspect ? adjustViewportForAspect(standard, width, height) : standard);
    }
  };

  // Toggle 1:1 square grid aspect ratio
  const toggleAspectLock = () => {
    const next = !lockAspect;
    setLockAspect(next);
    if (next) {
      setViewport((prev) => adjustViewportForAspect(prev, dimensions.width, dimensions.height));
    }
  };

  // Download chart image as PNG
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `coordinate-plot-${Date.now()}.png`;
    a.click();
  };

  if (!parsedInfo) return null;

  const hasDualCurves =
    parsedInfo.type === 'equation' && !parsedInfo.isRhsZero && parsedInfo.lhsFn && parsedInfo.rhsFn;

  return (
    <div
      className={`as-coord-plane-wrapper ${isExpanded ? 'as-coord-plane-expanded' : ''}`}
      ref={containerRef}
      data-testid="interactive-coordinate-plane"
    >
      {/* Plane Header & Toolbar */}
      <div className="as-coord-plane-header">
        <div className="as-coord-plane-title-group">
          <div className="as-coord-plane-icon">
            <Crosshair size={14} />
          </div>
          <div>
            <h4 className="as-coord-plane-title">Visual Solution (Interactive Coordinate Plane)</h4>
            <span className="as-coord-plane-subtitle">
              Drag to pan • Scroll / pinch to zoom • Hover points to inspect coordinates
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="as-coord-plane-actions">
          {hasDualCurves && (
            <div className="as-coord-plane-mode-toggle" title="Switch visual mode">
              <button
                type="button"
                className={`as-coord-mode-btn ${viewMode === 'dual' || viewMode === 'auto' ? 'active' : ''}`}
                onClick={() => setViewMode('dual')}
                data-testid="coord-mode-dual-btn"
              >
                Intersection View
              </button>
              <button
                type="button"
                className={`as-coord-mode-btn ${viewMode === 'single' ? 'active' : ''}`}
                onClick={() => setViewMode('single')}
                data-testid="coord-mode-single-btn"
              >
                Root View
              </button>
            </div>
          )}

          <button
            type="button"
            className="as-coord-btn"
            onClick={() => handleZoom(0.8)}
            title="Zoom in (+)"
            data-testid="coord-zoom-in-btn"
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            className="as-coord-btn"
            onClick={() => handleZoom(1.25)}
            title="Zoom out (-)"
            data-testid="coord-zoom-out-btn"
          >
            <ZoomOut size={14} />
          </button>

          <button
            type="button"
            className={`as-coord-btn ${lockAspect ? 'active' : ''}`}
            onClick={toggleAspectLock}
            title={lockAspect ? '1:1 Square Grid (Equal Scale) is Active' : 'Enable 1:1 Square Grid (Equal Scale)'}
            data-testid="coord-aspect-btn"
          >
            <Scale size={14} />
          </button>

          <button
            type="button"
            className="as-coord-btn"
            onClick={handleResetView}
            title="Fit / Reset View"
            data-testid="coord-reset-view-btn"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className={`as-coord-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid((v) => !v)}
            title={showGrid ? 'Hide Grid' : 'Show Grid'}
            data-testid="coord-toggle-grid-btn"
          >
            <Layers size={14} />
          </button>

          <button
            type="button"
            className={`as-coord-btn ${showPoints ? 'active' : ''}`}
            onClick={() => setShowPoints((v) => !v)}
            title={showPoints ? 'Hide Key Points' : 'Show Key Points'}
            data-testid="coord-toggle-points-btn"
          >
            {showPoints ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          <button
            type="button"
            className="as-coord-btn"
            onClick={() => setIsExpanded((v) => !v)}
            title={isExpanded ? 'Collapse Height' : 'Expand Height'}
            data-testid="coord-expand-btn"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            className="as-coord-btn"
            onClick={handleDownloadImage}
            title="Download PNG Plot"
            data-testid="coord-download-btn"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Interactive Canvas Stage */}
      <div
        className="as-coord-canvas-container"
        style={{ height: isExpanded ? 580 : defaultHeight }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoverCoord(null);
          setHoverPointInfo(null);
        }}
      >
        <canvas
          ref={canvasRef}
          className="as-coord-canvas"
          style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
        />

        {/* Live Hover Readout Pill */}
        {hoverCoord && (
          <div className="as-coord-hover-pill" data-testid="coord-hover-pill">
            <span className="as-coord-hover-coord">
              <MathBlock
                tex={`(${activeVar},\\, y) = (${trimNum(hoverCoord.x)},\\, ${trimNum(hoverCoord.y)})`}
                inline={true}
              />
            </span>
            {hoverPointInfo && (
              <span className="as-coord-hover-point-label">
                • <MathText text={hoverPointInfo.label} inline={true} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend & Plotted Curves Summary Bar with KaTeX Rendering */}
      <div className="as-coord-legend-bar" data-testid="coord-legend-bar">
        {parsedInfo.type === 'system' ? (
          <>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#4f46e5' }} />
              <span className="as-coord-legend-text">
                <MathBlock tex={`L_1: ${toLiveMathTex(parsedInfo.eq1).tex || parsedInfo.eq1}`} inline={true} />
              </span>
            </div>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#0d9488' }} />
              <span className="as-coord-legend-text">
                <MathBlock tex={`L_2: ${toLiveMathTex(parsedInfo.eq2).tex || parsedInfo.eq2}`} inline={true} />
              </span>
            </div>
            {keyPoints.length > 0 && (
              <div className="as-coord-legend-item">
                <span className="as-coord-legend-point-chip" style={{ background: '#c8522a' }} />
                <span className="as-coord-legend-text">
                  <strong>Intersection:</strong>{' '}
                  {keyPoints.map((pt, i) => (
                    <span key={i} className="as-coord-pt-chip" style={{ margin: '0 3px' }}>
                      <MathBlock tex={`(${trimNum(pt.x)},\\, ${trimNum(pt.y)})`} inline={true} />
                    </span>
                  ))}
                </span>
              </div>
            )}
          </>
        ) : hasDualCurves && viewMode !== 'single' ? (
          <>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#4f46e5' }} />
              <span className="as-coord-legend-text">
                <MathBlock
                  tex={`y_1 = ${toLiveMathTex(parsedInfo.L).tex || parsedInfo.L}`}
                  inline={true}
                />
              </span>
            </div>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#0d9488' }} />
              <span className="as-coord-legend-text">
                <MathBlock
                  tex={`y_2 = ${toLiveMathTex(parsedInfo.R).tex || parsedInfo.R}`}
                  inline={true}
                />
              </span>
            </div>
            {keyPoints.filter((p) => p.type === 'intersection').length > 0 && (
              <div className="as-coord-legend-item">
                <span className="as-coord-legend-point-chip" style={{ background: '#c8522a' }} />
                <span className="as-coord-legend-text">
                  <strong>Intersections:</strong>{' '}
                  {keyPoints
                    .filter((p) => p.type === 'intersection')
                    .slice(0, 3)
                    .map((pt, i) => (
                      <span key={i} className="as-coord-pt-chip" style={{ margin: '0 3px' }}>
                        <MathBlock tex={`(${trimNum(pt.x)},\\, ${trimNum(pt.y)})`} inline={true} />
                      </span>
                    ))}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#c8522a' }} />
              <span className="as-coord-legend-text">
                <MathBlock
                  tex={`y = ${toLiveMathTex(parsedInfo.raw).tex || parsedInfo.raw}`}
                  inline={true}
                />
              </span>
            </div>
            {parsedInfo.type === 'inequality' && (
              <div className="as-coord-legend-item">
                <span
                  className="as-coord-legend-shade-chip"
                  style={{ background: 'rgba(200, 82, 42, 0.25)' }}
                />
                <span className="as-coord-legend-text">
                  <MathText
                    text={`Solution Region \\((${parsedInfo.op})\\)`}
                    inline={true}
                  />
                </span>
              </div>
            )}
            {keyPoints.filter((p) => p.type === 'vertex').length > 0 && (
              <div className="as-coord-legend-item">
                <span className="as-coord-legend-point-chip" style={{ background: '#8b5cf6' }} />
                <span className="as-coord-legend-text">
                  <strong>Vertex:</strong>{' '}
                  {keyPoints
                    .filter((p) => p.type === 'vertex')
                    .map((pt, i) => (
                      <span key={i} className="as-coord-pt-chip" style={{ margin: '0 3px' }}>
                        <MathBlock tex={`(${trimNum(pt.x)},\\, ${trimNum(pt.y)})`} inline={true} />
                      </span>
                    ))}
                </span>
              </div>
            )}
            {keyPoints.filter((p) => p.type === 'root').length > 0 && (
              <div className="as-coord-legend-item">
                <span className="as-coord-legend-point-chip" style={{ background: '#c8522a' }} />
                <span className="as-coord-legend-text">
                  <strong>Roots / Zeros:</strong>{' '}
                  {keyPoints
                    .filter((p) => p.type === 'root')
                    .slice(0, 3)
                    .map((pt, i) => (
                      <span key={i} className="as-coord-pt-chip" style={{ margin: '0 3px' }}>
                        <MathBlock tex={`${activeVar} = ${trimNum(pt.x)}`} inline={true} />
                      </span>
                    ))}
                  {keyPoints.filter((p) => p.type === 'root').length > 3 && (
                    <span> (+{keyPoints.filter((p) => p.type === 'root').length - 3})</span>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
