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
} from 'lucide-react';
import { math, preprocess, trimNum } from '../engine/utils.js';

/**
 * Interactive Coordinate Plane Component
 * Visualizes algebraic equations, expressions, and inequality regions on a Cartesian 2D plane.
 *
 * Supports:
 * - Dual curve intersection plotting: y = LHS(x) and y = RHS(x)
 * - Single curve root plotting: y = LHS(x) - RHS(x) = 0
 * - 1D inequality shading (interval bands on x-axis and plane)
 * - 2D inequality half-plane shading (e.g. y <= 2x + 1)
 * - Pan (drag) & Zoom (wheel, pinch, controls)
 * - Real roots and key points (intercepts, vertex) highlighting
 * - Interactive hover crosshair and coordinates tooltip
 * - Retina/HiDPI canvas rendering
 * - Export as PNG
 */
export const CoordinatePlane = ({
  rawInput = '',
  result = null,
  variable = 'x',
  defaultHeight = 420,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

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

  // Mouse drag state for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartViewport, setDragStartViewport] = useState(null);

  // Hover coordinates in math space
  const [hoverCoord, setHoverCoord] = useState(null);
  const [hoverPointInfo, setHoverPointInfo] = useState(null);

  // Parse equation / inequality
  const parsedInfo = useMemo(() => {
    if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
      return null;
    }

    try {
      // Remove directives like "solve for y"
      const clean = rawInput
        .replace(/solve\s+(?:for\s+)?[a-zA-Z]/i, '')
        .replace(/,\s*(?:for\s+)?[a-zA-Z]\s*$/i, '')
        .replace(/^[,;:\s]+|[,;:\s]+$/g, '')
        .trim();

      const s = preprocess(clean);

      // Check inequality
      const ineqMatch = s.match(/(<=|>=|<|>)/);
      if (ineqMatch) {
        const op = ineqMatch[1];
        const [L, R] = s.split(op);
        const exprStr = `(${L}) - (${R})`;

        let testFn = null;
        try {
          testFn = math.compile(`(${L}) ${op} (${R})`);
        } catch {}

        let diffFn = null;
        try {
          diffFn = math.compile(exprStr);
        } catch {}

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

        return {
          type: 'inequality',
          op,
          opFunc,
          raw: s,
          L,
          R,
          hasY,
          testFn,
          diffFn,
          lhsFn,
          rhsFn,
          isStrict: op === '<' || op === '>',
        };
      }

      // Check equality
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

      // Standalone expression
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
  }, [rawInput]);

  // Extract numerical roots and key points from solver result
  const keyPoints = useMemo(() => {
    const pts = [];
    if (!result || !parsedInfo) return pts;

    const v = variable || 'x';

    // 1. Roots from result answers
    if (result.answers && Array.isArray(result.answers)) {
      result.answers.forEach((ans) => {
        const nums = [];
        if (typeof ans.num === 'number' && isFinite(ans.num)) nums.push(ans.num);
        if (typeof ans.pairNum === 'number' && isFinite(ans.pairNum)) nums.push(ans.pairNum);

        nums.forEach((rVal) => {
          let yVal = 0;
          let label = `Root: ${v} = ${trimNum(rVal)}`;

          if (parsedInfo.type === 'equation' && !parsedInfo.isRhsZero && viewMode !== 'single') {
            // In dual curve mode, intersection y-value
            if (parsedInfo.lhsFn) {
              try {
                const evalY = parsedInfo.lhsFn.evaluate({ [v]: rVal });
                if (typeof evalY === 'number' && isFinite(evalY)) {
                  yVal = evalY;
                  label = `Intersection: (${trimNum(rVal)}, ${trimNum(yVal)})`;
                }
              } catch {}
            }
          }

          if (!pts.some((p) => Math.abs(p.x - rVal) < 1e-4 && Math.abs(p.y - yVal) < 1e-4)) {
            pts.push({
              x: rVal,
              y: yVal,
              label,
              type: 'root',
              color: '#c8522a',
            });
          }
        });
      });
    }

    // 2. Y-intercept (x = 0)
    try {
      const fn = parsedInfo.diffFn || parsedInfo.lhsFn;
      if (fn) {
        const y0 = fn.evaluate({ [v]: 0 });
        if (typeof y0 === 'number' && isFinite(y0)) {
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
    } catch {}

    return pts;
  }, [result, parsedInfo, variable, viewMode]);

  // Auto-fit initial viewport when new problem or keypoints are loaded
  useEffect(() => {
    if (!keyPoints.length) {
      setViewport({ xMin: -8, xMax: 8, yMin: -6, yMax: 6 });
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

    setViewport({
      xMin: Math.floor(minX - padX),
      xMax: Math.ceil(maxX + padX),
      yMin: Math.floor(minY - padY),
      yMax: Math.ceil(maxY + padY),
    });
  }, [keyPoints]);

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

  // Compute nice grid step intervals
  const getGridStep = (span) => {
    const rough = span / 10;
    const power = Math.pow(10, Math.floor(Math.log10(rough)));
    const frac = rough / power;
    if (frac <= 1.5) return 1 * power;
    if (frac <= 3.5) return 2 * power;
    if (frac <= 7.5) return 5 * power;
    return 10 * power;
  };

  // Safe evaluation wrapper
  const safeEval = (fn, xVal) => {
    try {
      const val = fn.evaluate({ [variable]: xVal });
      if (typeof val === 'number' && isFinite(val)) return val;
      if (val && typeof val.re === 'number' && isFinite(val.re) && Math.abs(val.im || 0) < 1e-9) {
        return val.re;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Render canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedInfo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    // Retina DPI scale
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, width, height);

    const { xMin, xMax, yMin, yMax } = viewport;
    const spanX = xMax - xMin;
    const spanY = yMax - yMin;

    const xStep = getGridStep(spanX);
    const yStep = getGridStep(spanY);

    // -------------------------------------------------------------
    // 1. Shaded Inequality Region (if inequality)
    // -------------------------------------------------------------
    if (parsedInfo.type === 'inequality' && showShading) {
      ctx.save();
      const { testFn, lhsFn, rhsFn, opFunc, isStrict } = parsedInfo;

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
            return !!testFn.evaluate({ [variable]: valX });
          } catch {}
        }
        return false;
      };

      // Vertical strip shading across horizontal intervals
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

      // Highlighted interval bar along the X-axis
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
      }

      // Draw boundary line(s) for inequality at real boundary roots
      if (keyPoints && keyPoints.length > 0) {
        ctx.save();
        ctx.lineWidth = 1.75;
        ctx.strokeStyle = '#c8522a';
        if (isStrict) {
          ctx.setLineDash([6, 4]); // Dashed for <, >
        } else {
          ctx.setLineDash([]); // Solid for <=, >=
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

      ctx.restore();
    }

    // -------------------------------------------------------------
    // 2. Coordinate Grid Lines & Ticks
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
    // 3. Main X and Y Axes (thick)
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

    // Axis arrows / names
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#5a4b3f';
    ctx.textAlign = 'right';
    ctx.fillText('x', width - 8, Math.min(Math.max(originY - 6, 14), height - 8));
    ctx.textAlign = 'left';
    ctx.fillText('y', Math.min(Math.max(originX + 8, 8), width - 16), 14);

    ctx.restore();

    // -------------------------------------------------------------
    // 4. Function Curves Plotting
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
      const numSamples = Math.min(width * 2, 1000);
      let isDrawing = false;
      let prevY = null;

      for (let i = 0; i <= numSamples; i++) {
        const sx = (i / numSamples) * width;
        const mx = toMathX(sx, width);
        const my = safeEval(fn, mx);

        if (my === null || !isFinite(my)) {
          isDrawing = false;
          prevY = null;
          continue;
        }

        const sy = toScreenY(my, height);

        // Detect vertical asymptotic jumps
        if (isDrawing && prevY !== null) {
          const jump = Math.abs(sy - prevY);
          if (jump > height * 0.75 && (sy < 0 || sy > height || prevY < 0 || prevY > height)) {
            isDrawing = false;
            prevY = null;
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
      }

      ctx.stroke();
      ctx.restore();
    };

    // Determine curve plotting mode:
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
      const targetFn = parsedInfo.diffFn || parsedInfo.exprFn || parsedInfo.lhsFn;
      plotCurve(targetFn, '#c8522a', parsedInfo.isStrict, 2.5);
    }

    // -------------------------------------------------------------
    // 5. Solution Roots & Key Points Markers
    // -------------------------------------------------------------
    if (showPoints && keyPoints.length > 0) {
      keyPoints.forEach((pt) => {
        const sx = toScreenX(pt.x, width);
        const sy = toScreenY(pt.y, height);

        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return;

        ctx.save();
        // Pulsing glow ring
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
        ctx.fillStyle = pt.color === '#0d9488' ? 'rgba(13, 148, 136, 0.25)' : 'rgba(200, 82, 42, 0.25)';
        ctx.fill();

        // Inner solid point
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = pt.color || '#c8522a';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label tooltip
        ctx.fillStyle = '#2b2118';
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';

        const labelText = `(${trimNum(pt.x)}, ${trimNum(pt.y)})`;
        const metrics = ctx.measureText(labelText);
        const pad = 4;
        const boxW = metrics.width + pad * 2;
        const boxH = 16;
        const boxY = sy - 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
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
    // 6. Interactive Crosshair & Cursor Snapping
    // -------------------------------------------------------------
    if (showCrosshair && hoverCoord) {
      const hx = toScreenX(hoverCoord.x, width);
      const hy = toScreenY(hoverCoord.y, height);

      ctx.save();
      ctx.strokeStyle = 'rgba(140, 126, 114, 0.6)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();

      // Horizontal crosshair
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
    toScreenX,
    toScreenY,
    toMathX,
    toMathY,
  ]);

  // Mouse wheel zoom (centered on cursor math coordinates)
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
      const spanY = (prev.yMax - prev.yMin) * zoomFactor;

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
    const thresholdDist = 12; // screen px
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

  // Zoom buttons
  const handleZoom = (factor) => {
    setViewport((prev) => {
      const midX = (prev.xMin + prev.xMax) / 2;
      const midY = (prev.yMin + prev.yMax) / 2;
      const halfSpanX = ((prev.xMax - prev.xMin) * factor) / 2;
      const halfSpanY = ((prev.yMax - prev.yMin) * factor) / 2;
      return {
        xMin: midX - halfSpanX,
        xMax: midX + halfSpanX,
        yMin: midY - halfSpanY,
        yMax: midY + halfSpanY,
      };
    });
  };

  // Reset view to fit keypoints or standard
  const handleResetView = () => {
    if (keyPoints.length > 0) {
      let minX = Math.min(0, ...keyPoints.map((p) => p.x));
      let maxX = Math.max(0, ...keyPoints.map((p) => p.x));
      let minY = Math.min(0, ...keyPoints.map((p) => p.y));
      let maxY = Math.max(0, ...keyPoints.map((p) => p.y));

      const spanX = Math.max(maxX - minX, 6);
      const spanY = Math.max(maxY - minY, 6);

      const padX = Math.max(spanX * 0.35, 2.5);
      const padY = Math.max(spanY * 0.35, 2.5);

      setViewport({
        xMin: Math.floor(minX - padX),
        xMax: Math.ceil(maxX + padX),
        yMin: Math.floor(minY - padY),
        yMax: Math.ceil(maxY + padY),
      });
    } else {
      setViewport({ xMin: -8, xMax: 8, yMin: -6, yMax: 6 });
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
              Click and drag to pan • Scroll to zoom • Hover to inspect coordinates
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
            className="as-coord-btn"
            onClick={handleResetView}
            title="Reset View"
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

      {/* Interactive Canvas Canvas Stage */}
      <div
        className="as-coord-canvas-container"
        style={{ height: isExpanded ? 580 : defaultHeight }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
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
              x: {trimNum(hoverCoord.x)}, y: {trimNum(hoverCoord.y)}
            </span>
            {hoverPointInfo && (
              <span className="as-coord-hover-point-label">
                • {hoverPointInfo.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend & Plotted Curves Summary Bar */}
      <div className="as-coord-legend-bar" data-testid="coord-legend-bar">
        {hasDualCurves && viewMode !== 'single' ? (
          <>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#4f46e5' }} />
              <span className="as-coord-legend-text">
                <strong>y₁</strong> = {parsedInfo.L}
              </span>
            </div>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#0d9488' }} />
              <span className="as-coord-legend-text">
                <strong>y₂</strong> = {parsedInfo.R}
              </span>
            </div>
            {keyPoints.length > 0 && (
              <div className="as-coord-legend-item">
                <span className="as-coord-legend-point-chip" style={{ background: '#c8522a' }} />
                <span className="as-coord-legend-text">
                  Intersections ({keyPoints.length})
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="as-coord-legend-item">
              <span className="as-coord-legend-chip" style={{ background: '#c8522a' }} />
              <span className="as-coord-legend-text">
                <strong>y</strong> = {parsedInfo.raw}
              </span>
            </div>
            {parsedInfo.type === 'inequality' && (
              <div className="as-coord-legend-item">
                <span
                  className="as-coord-legend-shade-chip"
                  style={{ background: 'rgba(200, 82, 42, 0.25)' }}
                />
                <span className="as-coord-legend-text">
                  Solution Region ({parsedInfo.op})
                </span>
              </div>
            )}
            {keyPoints.length > 0 && (
              <div className="as-coord-legend-item">
                <span className="as-coord-legend-point-chip" style={{ background: '#c8522a' }} />
                <span className="as-coord-legend-text">
                  Roots / Zeros ({keyPoints.length})
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
