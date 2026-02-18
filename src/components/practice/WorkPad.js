'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './WorkPad.module.css';

const MAX_HISTORY = 25;

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export default function WorkPad({ open, onClose, mode = 'modal' }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [tool, setTool] = useState('pen');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = ctx;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setVersion((prev) => prev + 1);
  }, [open]);

  if (!open) return null;

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
    const point = getPoint(event, canvas);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDraw = (event) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const point = getPoint(event, canvas);
    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
    } else {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 5;
    }
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
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
    setVersion((prev) => prev + 1);
  };

  const clearAll = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    saveSnapshot();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const containerClass = mode === 'inline' ? styles.inlineContainer : styles.overlay;
  const panelClass = mode === 'inline' ? `${styles.panel} ${styles.inlinePanel}` : styles.panel;

  return (
    <div className={containerClass} role={mode === 'modal' ? 'dialog' : undefined} aria-modal={mode === 'modal' ? 'true' : undefined}>
      <div className={panelClass}>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={`${styles.toolButton} ${tool === 'pen' ? styles.active : ''}`}
            onClick={() => setTool('pen')}
          >
            Pen
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${tool === 'eraser' ? styles.active : ''}`}
            onClick={() => setTool('eraser')}
          >
            Erase
          </button>
          <button type="button" className={styles.toolButton} onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className={styles.toolButton} onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <button type="button" className={styles.toolButton} onClick={clearAll}>
            Clear
          </button>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <canvas
          key={version > -1 ? 'workpad' : 'workpad'}
          ref={canvasRef}
          width={1000}
          height={420}
          className={styles.canvas}
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
