'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FillInTheBlankRenderer.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SpeakerButton from './SpeakerButton';
import SafeImage from './SafeImage';

export default function FillInTheBlankRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    const arithmeticCellRefs = useRef({});
    const [activeArithmeticCellId, setActiveArithmeticCellId] = useState(null);

    const getRepeatCount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 1;
        return Math.min(Math.floor(parsed), 24);
    };

    const parseCorrectAnswers = () => {
        try {
            const parsed = JSON.parse(question.correctAnswerText || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const correctAnswers = parseCorrectAnswers();

    const getInputConfig = (part) => {
        const declaredType = String(part?.answerType || part?.answer_type || '').toLowerCase();
        if (declaredType === 'number' || declaredType === 'numeric') {
            return { inputMode: 'numeric', pattern: '[0-9]*' };
        }
        if (declaredType === 'decimal') {
            return { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
        }

        const expected = correctAnswers?.[part.id];
        if (typeof expected === 'number') {
            return Number.isInteger(expected)
                ? { inputMode: 'numeric', pattern: '[0-9]*' }
                : { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
        }

        if (typeof expected === 'string') {
            const trimmed = expected.trim();
            if (/^-?\d+$/.test(trimmed)) {
                return { inputMode: 'numeric', pattern: '[-]?[0-9]*' };
            }
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                return { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
            }
        }

        return { inputMode: 'text', pattern: undefined };
    };

    const handleInputChange = (inputId, value) => {
        const newAnswer = { ...(userAnswer || {}), [inputId]: value };
        onAnswer(newAnswer);
    };

    const getCellInputConfig = (cell) => {
        const rawType = String(cell?.type || cell?.answerType || '').toLowerCase();
        if (rawType === 'digit') return { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 1 };
        if (rawType === 'number' || rawType === 'numeric') return { inputMode: 'numeric', pattern: '[-]?[0-9]*', maxLength: 6 };
        return { inputMode: 'text', pattern: undefined, maxLength: 1 };
    };

    const renderArithmeticLayout = (part) => {
        const rows = Array.isArray(part?.layout?.rows) ? part.layout.rows : [];
        const arithmeticInputMode = String(
            part?.layout?.inputMode ||
            part?.layout?.input_mode ||
            question?.adaptiveConfig?.inputMode ||
            question?.adaptiveConfig?.input_mode ||
            ''
        ).toLowerCase();
        const useDigitPad = arithmeticInputMode === 'digitpad' || arithmeticInputMode === 'digit_pad';
        const isBeginnerMode =
            String(question?.adaptiveConfig?.mode || '').toLowerCase() === 'beginner' ||
            String(part?.layout?.mode || '').toLowerCase() === 'beginner';
        const measureColumns = (text) => String(text || '').replace(/\s+/g, '').length;
        const maxColumns = rows.reduce((max, row) => {
            const kind = String(row?.kind || '').toLowerCase();
            if (kind === 'answer') {
                const cells = Array.isArray(row?.cells) ? row.cells.length : 0;
                const prefixWidth = measureColumns(row?.prefix || '');
                return Math.max(max, prefixWidth + cells);
            }
            if (kind === 'divider') return max;
            return Math.max(max, measureColumns(row?.text || ''));
        }, 0);

        const renderTextGrid = (text) => {
            const compact = String(text || '').replace(/\s+/g, '');
            const chars = compact.split('');
            const pad = Math.max(0, maxColumns - chars.length);
            return (
                <div className={styles.arGridRow} style={{ '--cols': maxColumns }}>
                    {Array.from({ length: pad }).map((_, i) => (
                        <span key={`pad-${i}`} className={styles.arGridCell} />
                    ))}
                    {chars.map((ch, i) => (
                        <span key={`ch-${i}`} className={styles.arGridCell}>{ch}</span>
                    ))}
                </div>
            );
        };

        const answerRows = rows
            .map((row, rowIndex) => ({
                row,
                rowIndex,
                kind: String(row?.kind || '').toLowerCase(),
                cells: Array.isArray(row?.cells) ? row.cells : [],
            }))
            .filter((entry) => entry.kind === 'answer');

        const rowStepByIndex = new Map();
        answerRows.forEach((entry, stepIdx) => {
            rowStepByIndex.set(entry.rowIndex, stepIdx);
        });

        const getPreviousAnswerRow = (rowIndex) => {
            const step = rowStepByIndex.get(rowIndex);
            if (typeof step !== 'number' || step <= 0) return null;
            return answerRows[step - 1] || null;
        };

        const applyCarryDigits = ({ currentRowIndex, currentCellIndex, typedValue, updates }) => {
            const carrySource = String(typedValue || '').replace(/[^0-9]/g, '');
            if (carrySource.length <= 1) return false;

            const carryRow = getPreviousAnswerRow(currentRowIndex);
            if (!carryRow || !Array.isArray(carryRow.cells) || carryRow.cells.length === 0) return false;

            const carryDigits = carrySource.slice(0, -1);
            let carryPlaced = false;
            let targetIndex = currentCellIndex - 1;

            for (let i = carryDigits.length - 1; i >= 0; i -= 1) {
                if (targetIndex < 0) break;
                const carryCellId = String(carryRow.cells[targetIndex]?.id || `cell_${carryRow.rowIndex}_${targetIndex}`);
                updates[carryCellId] = carryDigits[i];
                carryPlaced = true;
                targetIndex -= 1;
            }

            return carryPlaced;
        };
        const cellMetaById = new Map();
        answerRows.forEach((entry) => {
            entry.cells.forEach((cell, cellIndex) => {
                const id = String(cell?.id || `cell_${entry.rowIndex}_${cellIndex}`);
                cellMetaById.set(id, { rowIndex: entry.rowIndex, cellIndex, cells: entry.cells });
            });
        });

        const stepCompletion = answerRows.map((entry) =>
            entry.cells.length > 0 &&
            entry.cells.every((cell, idx) => {
                const id = String(cell?.id || `cell_${entry.rowIndex}_${idx}`);
                return String(userAnswer?.[id] || '').trim() !== '';
            })
        );
        const firstIncompleteStep = stepCompletion.findIndex((complete) => !complete);
        const resolvedActiveStep = firstIncompleteStep === -1
            ? Math.max(0, answerRows.length - 1)
            : firstIncompleteStep;
        const activeRow = answerRows[resolvedActiveStep] || null;

        const getCellId = (rowIndex, cells, cellIndex) =>
            String(cells[cellIndex]?.id || `cell_${rowIndex}_${cellIndex}`);

        const getPreferredCellIdForRow = (rowEntry) => {
            if (!rowEntry) return null;
            const cells = Array.isArray(rowEntry.cells) ? rowEntry.cells : [];
            if (cells.length === 0) return null;
            for (let i = cells.length - 1; i >= 0; i -= 1) {
                const candidateId = getCellId(rowEntry.rowIndex, cells, i);
                if (String(userAnswer?.[candidateId] || '').trim() === '') return candidateId;
            }
            return getCellId(rowEntry.rowIndex, cells, cells.length - 1);
        };

        const getActiveCellIdForPad = () => {
            if (activeArithmeticCellId) {
                const meta = cellMetaById.get(activeArithmeticCellId);
                if (meta) {
                    const rowStep = rowStepByIndex.get(meta.rowIndex) ?? 0;
                    const isLocked = isBeginnerMode && rowStep !== resolvedActiveStep;
                    if (!isLocked) return activeArithmeticCellId;
                }
            }
            return getPreferredCellIdForRow(activeRow);
        };

        const handleDigitPadPress = (digit) => {
            if (isAnswered) return;
            const targetId = getActiveCellIdForPad();
            if (!targetId) return;
            const meta = cellMetaById.get(targetId);
            if (!meta) return;

            const updates = { ...(userAnswer || {}), [targetId]: String(digit) };
            onAnswer(updates);

            const nextIndex = Math.max(0, meta.cellIndex - 1);
            const nextId = getCellId(meta.rowIndex, meta.cells, nextIndex);
            setActiveArithmeticCellId(nextId);
            arithmeticCellRefs.current[nextId]?.focus();
        };

        const handleDigitPadBackspace = () => {
            if (isAnswered) return;
            const targetId = getActiveCellIdForPad();
            if (!targetId) return;
            const meta = cellMetaById.get(targetId);
            if (!meta) return;

            const currentValue = String(userAnswer?.[targetId] || '');
            const updates = { ...(userAnswer || {}) };

            if (currentValue !== '') {
                updates[targetId] = '';
                onAnswer(updates);
                setActiveArithmeticCellId(targetId);
                arithmeticCellRefs.current[targetId]?.focus();
                return;
            }

            if (meta.cellIndex < meta.cells.length - 1) {
                const rightId = getCellId(meta.rowIndex, meta.cells, meta.cellIndex + 1);
                updates[rightId] = '';
                onAnswer(updates);
                setActiveArithmeticCellId(rightId);
                arithmeticCellRefs.current[rightId]?.focus();
            }
        };

        const handleDigitPadClearRow = () => {
            if (isAnswered || !activeRow) return;
            const updates = { ...(userAnswer || {}) };
            activeRow.cells.forEach((cell, index) => {
                const id = getCellId(activeRow.rowIndex, activeRow.cells, index);
                updates[id] = '';
            });
            onAnswer(updates);
            const startId = getPreferredCellIdForRow(activeRow);
            setActiveArithmeticCellId(startId);
            if (startId) arithmeticCellRefs.current[startId]?.focus();
        };

        return (
            <div className={styles.arithmeticLayout} style={{ '--cols': maxColumns }}>
                {rows.map((row, rowIndex) => {
                    const kind = String(row?.kind || '').toLowerCase();

                    if (kind === 'divider') {
                        return <div key={`ar-row-${rowIndex}`} className={styles.arDivider} />;
                    }

                    if (kind === 'answer') {
                        const cells = Array.isArray(row?.cells) ? row.cells : [];
                        const rowStep = rowStepByIndex.get(rowIndex) ?? 0;
                        const isRowLocked = isBeginnerMode && rowStep !== resolvedActiveStep;
                        const prefix = String(row?.prefix || '').replace(/\s+/g, '');
                        const prefixChars = prefix.split('');
                        const usedColumns = prefixChars.length + cells.length;
                        const leftPad = Math.max(0, maxColumns - usedColumns);
                        return (
                            <div key={`ar-row-${rowIndex}`} className={styles.arAnswerRow}>
                                <div className={styles.arGridRow} style={{ '--cols': maxColumns }}>
                                    {Array.from({ length: leftPad }).map((_, i) => (
                                        <span key={`ans-pad-${i}`} className={styles.arGridCell} />
                                    ))}
                                    {prefixChars.map((ch, i) => (
                                        <span key={`pre-${i}`} className={`${styles.arGridCell} ${styles.arPrefixCell}`}>{ch}</span>
                                    ))}
                                    {cells.map((cell, cellIndex) => {
                                        const id = String(cell?.id || `cell_${rowIndex}_${cellIndex}`);
                                        const cfg = getCellInputConfig(cell);
                                        const isActiveCell = useDigitPad && activeArithmeticCellId === id;
                                        return (
                                            <span key={id} className={styles.arGridCell}>
                                                <input
                                                    ref={(el) => {
                                                        if (el) arithmeticCellRefs.current[id] = el;
                                                    }}
                                                    type="text"
                                                    className={`${styles.arCellInput} ${isActiveCell ? styles.arCellInputActive : ''}`}
                                                    value={userAnswer?.[id] || ''}
                                                    onChange={(e) => {
                                                        if (useDigitPad) return;
                                                        let next = e.target.value.toUpperCase();
                                                        if (cfg.inputMode === 'numeric' || cfg.pattern?.includes('[0-9]')) {
                                                            next = next.replace(/[^0-9-]/g, '');
                                                        }
                                                        next = next.slice(0, 8);

                                                        // If a two-digit sum is typed in one box, auto-carry leading digit(s) to the row above.
                                                        if (next.length > 1 && cfg.maxLength === 1) {
                                                            const updates = { ...(userAnswer || {}) };
                                                            const lastDigit = next.slice(-1);
                                                            updates[id] = lastDigit;
                                                            applyCarryDigits({
                                                                currentRowIndex: rowIndex,
                                                                currentCellIndex: cellIndex,
                                                                typedValue: next,
                                                                updates,
                                                            });
                                                            onAnswer(updates);

                                                            if (cellIndex > 0) {
                                                                const leftId = String(cells[cellIndex - 1]?.id || `cell_${rowIndex}_${cellIndex - 1}`);
                                                                arithmeticCellRefs.current[leftId]?.focus();
                                                            }
                                                            return;
                                                        }

                                                        // Support paste/multi-digit entry: fill current row from right to left.
                                                        if (next.length > 1) {
                                                            const chars = next.slice(0, cells.length).split('');
                                                            const updates = { ...(userAnswer || {}) };
                                                            let cursor = cellIndex;
                                                            chars.forEach((char) => {
                                                                if (cursor < 0) return;
                                                                const targetId = String(cells[cursor]?.id || `cell_${rowIndex}_${cursor}`);
                                                                updates[targetId] = char;
                                                                cursor -= 1;
                                                            });
                                                            onAnswer(updates);
                                                            const focusId = String(cells[Math.max(0, cellIndex - chars.length)]?.id || `cell_${rowIndex}_${Math.max(0, cellIndex - chars.length)}`);
                                                            arithmeticCellRefs.current[focusId]?.focus();
                                                            return;
                                                        }

                                                        next = next.slice(0, cfg.maxLength);
                                                        handleInputChange(id, next);

                                                        // Move cursor from ones -> tens -> hundreds (right to left).
                                                        if (next && cellIndex > 0) {
                                                            const leftId = String(cells[cellIndex - 1]?.id || `cell_${rowIndex}_${cellIndex - 1}`);
                                                            arithmeticCellRefs.current[leftId]?.focus();
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        const currentVal = String(userAnswer?.[id] || '');
                                                        if (e.key === 'Backspace' && !currentVal && cellIndex < cells.length - 1) {
                                                            const rightId = String(cells[cellIndex + 1]?.id || `cell_${rowIndex}_${cellIndex + 1}`);
                                                            arithmeticCellRefs.current[rightId]?.focus();
                                                        }
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    onClick={() => setActiveArithmeticCellId(id)}
                                                    disabled={isAnswered || isRowLocked}
                                                    readOnly={useDigitPad}
                                                    inputMode={useDigitPad ? 'none' : cfg.inputMode}
                                                    pattern={cfg.pattern}
                                                    maxLength={cfg.maxLength}
                                                />
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    const text = String(row?.text || '');
                    if (!text) return null;
                    if (kind === 'text') {
                        const words = text.trim().split(/\s+/).filter(Boolean);
                        return (
                            <div key={`ar-row-${rowIndex}`} className={styles.arLabelRow}>
                                {words.length > 0 ? words.map((word, wordIndex) => (
                                    <span key={`label-${rowIndex}-${wordIndex}`} className={styles.arLabelWord}>
                                        {word}
                                    </span>
                                )) : <span className={styles.arLabelWord}>{text}</span>}
                            </div>
                        );
                    }
                    return (
                        <div key={`ar-row-${rowIndex}`} className={styles.arTextRow}>
                            {renderTextGrid(text)}
                        </div>
                    );
                })}
                {useDigitPad && !isAnswered && (
                    <div className={styles.arDigitPad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                            <button
                                key={`pad-${digit}`}
                                type="button"
                                className={styles.arPadBtn}
                                onClick={() => handleDigitPadPress(digit)}
                            >
                                {digit}
                            </button>
                        ))}
                        <button type="button" className={styles.arPadBtn} onClick={handleDigitPadBackspace}>
                            Del
                        </button>
                        <button type="button" className={styles.arPadBtn} onClick={handleDigitPadClearRow}>
                            Clear
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderPictureEquation = (part) => {
        const cfg = part?.layout || {};
        const left = cfg.left || {};
        const right = cfg.right || {};
        const total = cfg.total || {};
        const footer = String(cfg.footerEmojis || cfg.footer || '');

        const normalizeEmojiLine = (emoji, count) => {
            const unit = String(emoji || '🍐');
            const qty = Number(count);
            const safeCount = Number.isFinite(qty) ? Math.max(0, Math.min(30, Math.floor(qty))) : 0;
            return Array.from({ length: safeCount }).map(() => unit).join('');
        };

        const leftLine = normalizeEmojiLine(left.emoji, left.count);
        const rightLine = normalizeEmojiLine(right.emoji, right.count);

        return (
            <div className={styles.pictureEq}>
                <div className={styles.pictureTerm}>
                    <div className={styles.pictureEmoji}>{leftLine}</div>
                    <input
                        type="text"
                        className={styles.pictureBox}
                        value={userAnswer?.[left.inputId || 'left_count'] || ''}
                        onChange={(e) => handleInputChange(left.inputId || 'left_count', e.target.value)}
                        disabled={isAnswered}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                <div className={styles.pictureOp}>+</div>

                <div className={styles.pictureTerm}>
                    <div className={styles.pictureEmoji}>{rightLine}</div>
                    <input
                        type="text"
                        className={styles.pictureBox}
                        value={userAnswer?.[right.inputId || 'right_count'] || ''}
                        onChange={(e) => handleInputChange(right.inputId || 'right_count', e.target.value)}
                        disabled={isAnswered}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                <div className={styles.pictureOp}>=</div>

                <div className={styles.pictureTerm}>
                    <div className={styles.pictureEmoji} />
                    <input
                        type="text"
                        className={styles.pictureBox}
                        value={userAnswer?.[total.inputId || 'total_count'] || ''}
                        onChange={(e) => handleInputChange(total.inputId || 'total_count', e.target.value)}
                        disabled={isAnswered}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                {footer ? <div className={styles.pictureFooter}>{footer}</div> : null}
            </div>
        );
    };

    useEffect(() => {
        // Focus ones place (right-most cell) on the first incomplete answer row.
        const arithmeticPart = (question?.parts || []).find((part) => part?.type === 'arithmeticLayout');
        const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
        const answerRows = rows
            .map((row, rowIndex) => ({
                rowIndex,
                kind: String(row?.kind || '').toLowerCase(),
                cells: Array.isArray(row?.cells) ? row.cells : [],
            }))
            .filter((entry) => entry.kind === 'answer');

        if (answerRows.length === 0) return;

        const stepCompletion = answerRows.map((entry) =>
            entry.cells.length > 0 &&
            entry.cells.every((cell, idx) => {
                const id = String(cell?.id || `cell_${entry.rowIndex}_${idx}`);
                return String(userAnswer?.[id] || '').trim() !== '';
            })
        );
        const firstIncompleteStep = stepCompletion.findIndex((complete) => !complete);
        const activeStep = firstIncompleteStep === -1
            ? Math.max(0, answerRows.length - 1)
            : firstIncompleteStep;
        const targetRow = answerRows[activeStep];
        const cells = Array.isArray(targetRow?.cells) ? targetRow.cells : [];
        if (cells.length === 0) return;

        let targetIndex = cells.length - 1;
        for (let i = cells.length - 1; i >= 0; i -= 1) {
            const id = String(cells[i]?.id || `cell_${targetRow.rowIndex}_${i}`);
            if (String(userAnswer?.[id] || '').trim() === '') {
                targetIndex = i;
                break;
            }
        }

        const targetId = String(
            cells[targetIndex]?.id || `cell_${targetRow.rowIndex}_${targetIndex}`
        );
        const target = arithmeticCellRefs.current[targetId];
        if (target && !isAnswered) {
            target.focus();
        }
        setActiveArithmeticCellId(targetId);
    }, [question?.id, isAnswered, userAnswer]);

    const wrapPart = (part, index, content) => {
        if (content === null) return null;
        const isVertical = Boolean(part?.isVertical);
        return (
            <div
                key={`wrap-${index}`}
                className={`${styles.partWrapper} ${isVertical ? styles.verticalPart : styles.inlinePart}`}
            >
                {content}
            </div>
        );
    };

    const renderPart = (part, index) => {
        switch (part.type) {
            case 'text':
                if (isInlineSvg(part.content)) {
                    return wrapPart(part, index, (
                        <div
                            className={styles.imageContainer}
                            dangerouslySetInnerHTML={{ __html: part.content }}
                        />
                    ));
                }
                if (isImageUrl(part.content)) {
                    return wrapPart(part, index, (
                        <div key={index} className={styles.imageContainer}>
                            <SafeImage
                                src={part.content}
                                alt="Question visual"
                                className={styles.image}
                                width={220}
                                height={150}
                                sizes="(max-width: 768px) 44vw, 220px"
                            />
                        </div>
                    ));
                }
                return wrapPart(part, index, (
                    <span className={styles.textWithSpeaker}>
                        {Boolean(part?.hasAudio) && (
                            <SpeakerButton text={part.content} className={styles.inlineSpeaker} />
                        )}
                        {hasInlineHtml(part.content) ? (
                            <span
                                className={styles.text}
                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(part.content) }}
                            />
                        ) : (
                            <span className={styles.text}>{part.content}</span>
                        )}
                    </span>
                ));

            case 'image':
                if (isInlineSvg(getImageSrc(part.imageUrl))) {
                    const repeatCount = getRepeatCount(part?.count);
                    return wrapPart(part, index, (
                        <div className={styles.imageContainer}>
                            {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                                <div
                                    key={`svg-${index}-${imageIndex}`}
                                    dangerouslySetInnerHTML={{ __html: getImageSrc(part.imageUrl) }}
                                />
                            ))}
                        </div>
                    ));
                }
                const repeatCount = getRepeatCount(part?.count);
                return wrapPart(part, index, (
                    <div className={styles.imageContainer}>
                        {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                            <SafeImage
                                key={`img-${index}-${imageIndex}`}
                                src={getImageSrc(part.imageUrl)}
                                alt={`Question image ${imageIndex + 1}`}
                                className={styles.image}
                                width={220}
                                height={150}
                                style={{
                                    width: part.width ? `${part.width}px` : 'auto',
                                    height: part.height ? `${part.height}px` : 'auto',
                                }}
                                sizes="(max-width: 768px) 44vw, 220px"
                            />
                        ))}
                    </div>
                ));

            case 'sequence':
                return wrapPart(part, index, (
                    <div className={styles.sequence}>
                        {part.children.map((child, childIndex) => renderPart(child, `${index}-${childIndex}`))}
                    </div>
                ));

            case 'blank':
            case 'input':
                const inputConfig = getInputConfig(part);
                return wrapPart(part, index, (
                    <input
                        type="text"
                        className={styles.input}
                        value={userAnswer?.[part.id] || ''}
                        onChange={(e) => handleInputChange(part.id, e.target.value)}
                        disabled={isAnswered}
                        placeholder={part?.placeholder || ''}
                        aria-label={part?.placeholder || part?.id || 'blank input'}
                        style={{ width: part.width || '80px' }}
                        inputMode={inputConfig.inputMode}
                        pattern={inputConfig.pattern}
                        maxLength={Number.isFinite(Number(part?.maxLength)) ? Number(part.maxLength) : undefined}
                    />
                ));

            case 'arithmeticLayout':
                return wrapPart(part, index, renderArithmeticLayout(part));

            case 'pictureEquation':
                return wrapPart(part, index, renderPictureEquation(part));

            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.questionCard}>
                <div className={styles.questionContent}>
                    {question.parts.map((part, index) => renderPart(part, index))}
                </div>

                {question.showSubmitButton && userAnswer && !isAnswered && (
                    <button className={styles.submitButton} onClick={() => onSubmit()}>
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}
