'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './WorkPad.module.css';

const MAX_HISTORY = 30;
const COLORS = ['#111827', '#0f6ea8', '#16a34a', '#e11d48', '#f59e0b', '#7c3aed'];
const SHAPE_TOOLS = new Set(['line', 'rect', 'circle', 'triangle', 'arrow']);
const DRAW_TOOLS = new Set(['pen', 'marker', 'highlighter', 'eraser']);
const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 700;

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapPoint(point, enabled, gridSize = 24) {
  if (!enabled) return point;
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

function constrainPoint(startPoint, endPoint, enabled) {
  if (!enabled) return endPoint;

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy * 2) return { x: endPoint.x, y: startPoint.y };
  if (absDy > absDx * 2) return { x: startPoint.x, y: endPoint.y };

  const distance = Math.max(absDx, absDy);
  return {
    x: startPoint.x + Math.sign(dx || 1) * distance,
    y: startPoint.y + Math.sign(dy || 1) * distance,
  };
}

function drawShape(ctx, tool, startPoint, endPoint, color, lineWidth, fillShapes) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  if (tool === 'line') {
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
  } else if (tool === 'arrow') {
    const headLength = Math.max(10, lineWidth * 2.2);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const angle = Math.atan2(dy, dx);

    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
      endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
      endPoint.y - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
      endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
      endPoint.y - headLength * Math.sin(angle + Math.PI / 6),
    );
  } else if (tool === 'rect') {
    const width = endPoint.x - startPoint.x;
    const height = endPoint.y - startPoint.y;
    if (fillShapes) {
      ctx.fillStyle = `${color}33`;
      ctx.fillRect(startPoint.x, startPoint.y, width, height);
    }
    ctx.strokeRect(startPoint.x, startPoint.y, width, height);
    ctx.restore();
    return;
  } else if (tool === 'circle') {
    const radius = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
  } else if (tool === 'triangle') {
    const left = Math.min(startPoint.x, endPoint.x);
    const right = Math.max(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const bottom = Math.max(startPoint.y, endPoint.y);
    const midX = (left + right) / 2;

    ctx.moveTo(midX, top);
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
  }

  if (fillShapes && tool !== 'line' && tool !== 'arrow') {
    ctx.fillStyle = `${color}33`;
    ctx.fill();
  }

  ctx.stroke();
  ctx.restore();
}

function drawStickyNote(ctx, point, text) {
  const width = 210;
  const height = 130;
  const x = clamp(point.x, 6, DEFAULT_CANVAS_WIDTH - width - 6);
  const y = clamp(point.y, 6, DEFAULT_CANVAS_HEIGHT - height - 6);

  ctx.save();
  ctx.fillStyle = '#fff9b0';
  ctx.strokeStyle = '#d4c055';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#1f2937';
  ctx.font = '22px Nunito, Arial, sans-serif';
  ctx.textBaseline = 'top';

  const words = String(text || 'Note').split(/\s+/);
  let line = '';
  let lineY = y + 12;
  const maxWidth = width - 16;

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x + 8, lineY);
      line = word;
      lineY += 26;
    } else {
      line = test;
    }
  });

  if (line) ctx.fillText(line, x + 8, lineY);
  ctx.restore();
}

export default function WorkPad({ open, onClose, mode = 'modal', storageKey, onSnapshot }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const startPointRef = useRef(null);
  const lastPointRef = useRef(null);
  const previewSnapshotRef = useRef(null);
  const moveOffsetRef = useRef({ dx: 0, dy: 0 });
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(5);
  const [textValue, setTextValue] = useState('Text');
  const [gridMode, setGridMode] = useState('line');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [fillShapes, setFillShapes] = useState(false);
  const [largeControls, setLargeControls] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [version, setVersion] = useState(0);

  const storageId = storageKey ? `workpad_${storageKey}` : null;

  const persistCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !storageId || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageId, canvas.toDataURL('image/png'));
    } catch {
      // ignore quota/availability errors
    }
  };

  const loadCanvasFromStorage = () => {
    if (!storageId || typeof window === 'undefined') return false;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return false;

    const dataUrl = window.localStorage.getItem(storageId);
    if (!dataUrl) return false;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setVersion((prev) => prev + 1);
    };
    img.src = dataUrl;
    return true;
  };

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctxRef.current = ctx;
    undoStackRef.current = [];
    redoStackRef.current = [];

    const restored = loadCanvasFromStorage();
    if (!restored) {
      setVersion((prev) => prev + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storageKey]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const key = event.key.toLowerCase();
      if (key === 'p') setTool('pen');
      else if (key === 'm') setTool('marker');
      else if (key === 'h') setTool('highlighter');
      else if (key === 'e') setTool('eraser');
      else if (key === 'l') setTool('line');
      else if (key === 'r') setTool('rect');
      else if (key === 'c') setTool('circle');
      else if (key === 'a') setTool('arrow');
      else if (key === 't') setTool('text');
      else if (key === 'n') setTool('sticky');
      else if (key === 'g') setGridMode((prev) => (prev === 'none' ? 'line' : prev === 'line' ? 'math' : 'none'));
      else if (key === 's') setSnapToGrid((prev) => !prev);
      else if (key === 'f') setFillShapes((prev) => !prev);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const applyStrokeStyle = (ctx, currentTool, pressure = 0.5) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (currentTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(18, brushSize * 3);
      return;
    }

    ctx.strokeStyle = color;

    if (currentTool === 'highlighter') {
      ctx.lineWidth = brushSize + 12;
      ctx.globalAlpha = 0.3;
      return;
    }

    if (currentTool === 'marker') {
      const dynamic = brushSize + 2 + pressure * 2;
      ctx.lineWidth = dynamic;
      return;
    }

    const dynamic = brushSize + pressure * 1.8;
    ctx.lineWidth = dynamic;
  };

  const saveSnapshot = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const next = [...undoStackRef.current, snapshot];
    undoStackRef.current = next.slice(-MAX_HISTORY);
    redoStackRef.current = [];
    setVersion((prev) => prev + 1);
  };

  const startDraw = (event) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    saveSnapshot();
    drawingRef.current = true;

    const rawPoint = getPoint(event, canvas);
    const snapped = snapPoint(rawPoint, snapToGrid);
    startPointRef.current = snapped;
    lastPointRef.current = snapped;

    if (tool === 'move') {
      previewSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      moveOffsetRef.current = { dx: 0, dy: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'text' || tool === 'math' || tool === 'sticky') {
      applyStrokeStyle(ctx, 'pen');
      if (tool === 'sticky') {
        drawStickyNote(ctx, snapped, textValue);
      } else {
        ctx.fillStyle = color;
        ctx.font = `${Math.max(18, brushSize * 4)}px ${tool === 'math' ? 'ui-monospace, Menlo, Consolas, monospace' : 'Nunito, Arial, sans-serif'}`;
        ctx.fillText(String(textValue || (tool === 'math' ? 'x² + y² = z²' : 'Text')), snapped.x, snapped.y);
      }
      drawingRef.current = false;
      startPointRef.current = null;
      persistCanvas();
      setVersion((prev) => prev + 1);
      return;
    }

    if (SHAPE_TOOLS.has(tool)) {
      previewSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else if (DRAW_TOOLS.has(tool)) {
      applyStrokeStyle(ctx, tool, event.pressure || 0.5);
      ctx.beginPath();
      ctx.moveTo(snapped.x, snapped.y);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDraw = (event) => {
    if (!drawingRef.current) return;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const rawPoint = getPoint(event, canvas);
    const snapped = snapPoint(rawPoint, snapToGrid);

    if (tool === 'move') {
      if (!previewSnapshotRef.current || !startPointRef.current) return;
      const dx = Math.round(snapped.x - startPointRef.current.x);
      const dy = Math.round(snapped.y - startPointRef.current.y);
      moveOffsetRef.current = { dx, dy };

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(previewSnapshotRef.current, dx, dy);
      return;
    }

    if (SHAPE_TOOLS.has(tool)) {
      if (!previewSnapshotRef.current || !startPointRef.current) return;
      const constrained = constrainPoint(startPointRef.current, snapped, event.shiftKey);
      ctx.putImageData(previewSnapshotRef.current, 0, 0);
      drawShape(ctx, tool, startPointRef.current, constrained, color, Math.max(2, brushSize), fillShapes);
      return;
    }

    if (DRAW_TOOLS.has(tool)) {
      applyStrokeStyle(ctx, tool, event.pressure || 0.5);
      const start = lastPointRef.current || snapped;
      const midX = (start.x + snapped.x) / 2;
      const midY = (start.y + snapped.y) / 2;
      const constrainedMid = event.shiftKey && startPointRef.current
        ? constrainPoint(startPointRef.current, { x: midX, y: midY }, true)
        : { x: midX, y: midY };

      ctx.quadraticCurveTo(start.x, start.y, constrainedMid.x, constrainedMid.y);
      ctx.stroke();
      lastPointRef.current = snapped;
    }
  };

  const endDraw = (event) => {
    if (!drawingRef.current) return;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    if (ctx && canvas && event && SHAPE_TOOLS.has(tool) && previewSnapshotRef.current && startPointRef.current) {
      const rawPoint = getPoint(event, canvas);
      const snapped = snapPoint(rawPoint, snapToGrid);
      const constrained = constrainPoint(startPointRef.current, snapped, event.shiftKey);
      ctx.putImageData(previewSnapshotRef.current, 0, 0);
      drawShape(ctx, tool, startPointRef.current, constrained, color, Math.max(2, brushSize), fillShapes);
    }

    if (ctx && canvas && tool === 'move' && previewSnapshotRef.current) {
      const { dx, dy } = moveOffsetRef.current;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(previewSnapshotRef.current, dx, dy);
    }

    drawingRef.current = false;
    startPointRef.current = null;
    lastPointRef.current = null;
    previewSnapshotRef.current = null;
    moveOffsetRef.current = { dx: 0, dy: 0 };
    persistCanvas();
    setVersion((prev) => prev + 1);
  };

  const undo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || undoStackRef.current.length === 0) return;

    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, current].slice(-MAX_HISTORY);
    ctx.putImageData(previous, 0, 0);
    persistCanvas();
    setVersion((prev) => prev + 1);
  };

  const redo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || redoStackRef.current.length === 0) return;

    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, current].slice(-MAX_HISTORY);
    ctx.putImageData(next, 0, 0);
    persistCanvas();
    setVersion((prev) => prev + 1);
  };

  const clearAll = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    saveSnapshot();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    persistCanvas();
  };

  const saveAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `wexls-workpad-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    if (typeof window !== 'undefined') {
      try {
        const key = 'teacher_workpad_snapshots';
        const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
        const next = [
          {
            questionKey: storageKey || null,
            createdAt: new Date().toISOString(),
            image: dataUrl,
          },
          ...existing,
        ].slice(0, 30);
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
    }

    if (typeof onSnapshot === 'function') {
      onSnapshot({
        questionKey: storageKey || null,
        createdAt: new Date().toISOString(),
        image: dataUrl,
      });
    }
  };

  const shareSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof navigator === 'undefined') return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(dataUrl);
      }
    } catch {
      // clipboard can fail silently
    }
  };

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const containerClass = mode === 'inline' ? styles.inlineContainer : styles.overlay;
  const panelClass = mode === 'inline' ? `${styles.panel} ${styles.inlinePanel}` : styles.panel;
  const canvasClass = [
    styles.canvas,
    gridMode === 'line' ? styles.gridLine : '',
    gridMode === 'math' ? styles.gridMath : '',
    highContrast ? styles.canvasHighContrast : '',
    largeControls ? styles.canvasLarge : '',
  ].join(' ');

  return (
    <div className={containerClass} role={mode === 'modal' ? 'dialog' : undefined} aria-modal={mode === 'modal' ? 'true' : undefined}>
      <div className={`${panelClass} ${largeControls ? styles.panelLarge : ''}`}>
        <div className={styles.toolbar}>
          <button type="button" className={`${styles.toolButton} ${tool === 'pen' ? styles.active : ''}`} onClick={() => setTool('pen')}>Pen</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'marker' ? styles.active : ''}`} onClick={() => setTool('marker')}>Marker</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'highlighter' ? styles.active : ''}`} onClick={() => setTool('highlighter')}>Highlight</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'eraser' ? styles.active : ''}`} onClick={() => setTool('eraser')}>Erase</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'line' ? styles.active : ''}`} onClick={() => setTool('line')}>Line</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'rect' ? styles.active : ''}`} onClick={() => setTool('rect')}>Rectangle</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'circle' ? styles.active : ''}`} onClick={() => setTool('circle')}>Circle</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'triangle' ? styles.active : ''}`} onClick={() => setTool('triangle')}>Triangle</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'arrow' ? styles.active : ''}`} onClick={() => setTool('arrow')}>Arrow</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'text' ? styles.active : ''}`} onClick={() => setTool('text')}>Text</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'math' ? styles.active : ''}`} onClick={() => setTool('math')}>Math</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'sticky' ? styles.active : ''}`} onClick={() => setTool('sticky')}>Sticky</button>
          <button type="button" className={`${styles.toolButton} ${tool === 'move' ? styles.active : ''}`} onClick={() => setTool('move')}>Move</button>
          <div className={styles.spacer} />
          <button type="button" className={styles.toolButton} onClick={undo} disabled={!canUndo}>Undo</button>
          <button type="button" className={styles.toolButton} onClick={redo} disabled={!canRedo}>Redo</button>
          <button type="button" className={styles.toolButton} onClick={clearAll}>Clear</button>
          <button type="button" className={styles.toolButton} onClick={shareSnapshot}>Copy</button>
          <button type="button" className={styles.toolButton} onClick={saveAsImage}>Save</button>
          <button type="button" className={styles.closeButton} onClick={onClose}>Close</button>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.swatchRow}>
            {COLORS.map((swatchColor) => (
              <button
                key={swatchColor}
                type="button"
                className={`${styles.colorSwatch} ${color === swatchColor ? styles.colorActive : ''}`}
                style={{ background: swatchColor }}
                onClick={() => setColor(swatchColor)}
                aria-label={`Pick color ${swatchColor}`}
              />
            ))}
          </div>

          <div className={styles.sizeControls}>
            <span className={styles.sizeLabel}>Size</span>
            <input type="range" min="2" max="18" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} className={styles.sizeSlider} />
          </div>

          {(tool === 'text' || tool === 'math' || tool === 'sticky') && (
            <input
              type="text"
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              className={styles.textInput}
              placeholder={tool === 'sticky' ? 'Sticky note text...' : tool === 'math' ? 'Type math text...' : 'Type text...'}
            />
          )}
        </div>

        <div className={styles.toggleRow}>
          <button type="button" className={`${styles.toggleButton} ${gridMode !== 'none' ? styles.activeToggle : ''}`} onClick={() => setGridMode((prev) => (prev === 'none' ? 'line' : prev === 'line' ? 'math' : 'none'))}>
            Grid: {gridMode}
          </button>
          <button type="button" className={`${styles.toggleButton} ${snapToGrid ? styles.activeToggle : ''}`} onClick={() => setSnapToGrid((prev) => !prev)}>
            Snap
          </button>
          <button type="button" className={`${styles.toggleButton} ${fillShapes ? styles.activeToggle : ''}`} onClick={() => setFillShapes((prev) => !prev)}>
            Fill Shapes
          </button>
          <button type="button" className={`${styles.toggleButton} ${largeControls ? styles.activeToggle : ''}`} onClick={() => setLargeControls((prev) => !prev)}>
            Large Controls
          </button>
          <button type="button" className={`${styles.toggleButton} ${highContrast ? styles.activeToggle : ''}`} onClick={() => setHighContrast((prev) => !prev)}>
            High Contrast
          </button>
          <span className={styles.shortcutHint}>Shortcuts: P/M/H/E/L/R/C/A/T/N/G/S/F</span>
        </div>

        <canvas
          key={version > -1 ? 'workpad' : 'workpad'}
          ref={canvasRef}
          width={DEFAULT_CANVAS_WIDTH}
          height={DEFAULT_CANVAS_HEIGHT}
          className={canvasClass}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
        />
      </div>
    </div>
  );
}
