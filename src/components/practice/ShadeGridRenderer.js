'use client';

import { useMemo, useRef, useState } from 'react';
import QuestionParts from './QuestionParts';
import styles from './ShadeGridRenderer.module.css';

function parseFinite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFraction(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return { numerator, denominator };
}

function extractFractionFromParts(parts) {
  const list = Array.isArray(parts) ? parts : [];
  for (const part of list) {
    const content = String(part?.content ?? '');
    const fraction = parseFraction(content);
    if (fraction) return fraction;
    const embedded = content.match(/(-?\d+)\s*\/\s*(\d+)/);
    if (embedded) {
      return {
        numerator: Number(embedded[1]),
        denominator: Number(embedded[2]),
      };
    }
  }
  return null;
}

function normalizeSelected(answer) {
  if (Array.isArray(answer)) return new Set(answer.map((v) => String(v)));
  if (answer && typeof answer === 'object' && Array.isArray(answer.selected)) {
    return new Set(answer.selected.map((v) => String(v)));
  }
  return new Set();
}

function resolveGrid(question) {
  const config = question?.adaptiveConfig || {};
  const explicitRows = parseFinite(config.gridRows);
  const explicitCols = parseFinite(config.gridCols);
  const orientation = String(
    config.orientation || config.gridOrientation || config.barOrientation || 'vertical'
  ).toLowerCase() === 'horizontal'
    ? 'horizontal'
    : 'vertical';
  const gridMode = String(config.gridMode || 'auto').toLowerCase();

  const fraction = (
    parseFraction(question?.correctAnswerText) ||
    extractFractionFromParts(question?.parts) ||
    (parseFinite(config.numerator) != null && parseFinite(config.denominator) != null
      ? { numerator: parseFinite(config.numerator), denominator: parseFinite(config.denominator) }
      : null)
  );

  let rows = explicitRows;
  let cols = explicitCols;

  const denominator = parseFinite(config.denominator) ?? fraction?.denominator ?? null;
  const shouldUseFractionBar = (
    gridMode === 'fractionbar' ||
    (gridMode === 'auto' && denominator && denominator > 1 && denominator <= 20)
  );

  if (shouldUseFractionBar && denominator) {
    if (orientation === 'horizontal') {
      rows = denominator;
      cols = 1;
    } else {
      rows = 1;
      cols = denominator;
    }
  } else if (!rows || !cols) {
    const denominator = parseFinite(config.denominator) ?? fraction?.denominator ?? null;
    if (denominator === 100) {
      rows = 10;
      cols = 10;
    } else {
      rows = 10;
      cols = 10;
    }
  }

  rows = Math.max(1, Math.min(20, Math.floor(rows)));
  cols = Math.max(1, Math.min(20, Math.floor(cols)));
  const totalCells = rows * cols;

  const explicitTarget = parseFinite(config.targetShaded);
  const numericCorrect = parseFinite(question?.correctAnswerText);
  const fractionTarget = fraction
    ? Math.round((fraction.numerator / fraction.denominator) * totalCells)
    : null;

  const targetRaw = explicitTarget ?? fractionTarget ?? numericCorrect ?? 0;
  const target = Math.max(0, Math.min(totalCells, Math.round(targetRaw)));
  const isBarModel = (rows === 1 && cols >= 5) || (cols === 1 && rows >= 5);

  return { rows, cols, target, totalCells, isBarModel, orientation };
}

export default function ShadeGridRenderer({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const { rows, cols, target, totalCells, isBarModel, orientation } = resolveGrid(question);
  const selected = normalizeSelected(userAnswer);
  const [isPainting, setIsPainting] = useState(false);
  const [paintMode, setPaintMode] = useState(null); // add | remove
  const gridRef = useRef(null);
  const visitedRef = useRef(new Set());

  const cellIds = useMemo(
    () => Array.from({ length: totalCells }, (_, i) => String(i)),
    [totalCells]
  );

  const emitSelection = (nextSet) => {
    onAnswer({
      selected: Array.from(nextSet),
      count: nextSet.size,
    });
  };

  const applyToCell = (cellId, modeOverride = null) => {
    if (isAnswered || cellId == null) return;
    if (visitedRef.current.has(cellId)) return;
    visitedRef.current.add(cellId);

    const next = new Set(selected);
    const mode = modeOverride || paintMode || (next.has(cellId) ? 'remove' : 'add');
    if (mode === 'add') next.add(cellId);
    else next.delete(cellId);
    emitSelection(next);
    setPaintMode(mode);
  };

  const getCellIdFromPoint = (clientX, clientY) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;

    const col = Math.min(cols - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * rows)));
    return String((row * cols) + col);
  };

  const handleGridPointerDown = (event) => {
    if (isAnswered) return;
    event.preventDefault();
    gridRef.current?.setPointerCapture?.(event.pointerId);
    visitedRef.current = new Set();
    const cellId = getCellIdFromPoint(event.clientX, event.clientY);
    if (cellId == null) return;
    setIsPainting(true);
    const nextMode = selected.has(cellId) ? 'remove' : 'add';
    applyToCell(cellId, nextMode);
  };

  const handleGridPointerMove = (event) => {
    if (!isPainting || isAnswered) return;
    const cellId = getCellIdFromPoint(event.clientX, event.clientY);
    if (cellId == null) return;
    applyToCell(cellId);
  };

  const handleGridPointerEnd = () => {
    setIsPainting(false);
    setPaintMode(null);
    visitedRef.current = new Set();
  };

  return (
    <div className={styles.container}>
      <div className={styles.questionCard}>
        <div className={styles.questionContent}>
          <QuestionParts parts={question.parts} />
          <p className={styles.hintText}>Click and drag to shade.</p>
        </div>

        <div
          ref={gridRef}
          className={`${styles.grid} ${isBarModel ? styles.barGrid : ''} ${isBarModel && orientation === 'horizontal' ? styles.barHorizontal : ''}`}
          style={{ '--rows': rows, '--cols': cols }}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerEnd}
          onPointerCancel={handleGridPointerEnd}
          onPointerLeave={handleGridPointerEnd}
        >
          {cellIds.map((cellId) => (
            <div
              key={cellId}
              className={`${styles.cell} ${selected.has(cellId) ? styles.shaded : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className={styles.counterRow}>
          <span>Shaded: {selected.size}</span>
          <span>Target: {target}</span>
        </div>

        {!isAnswered && (
          <button className={styles.submitButton} onClick={() => onSubmit()}>
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
