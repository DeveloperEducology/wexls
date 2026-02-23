'use client';

import styles from './QuestionParts.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SpeakerButton from './SpeakerButton';
import SafeImage from './SafeImage';
import { latexWithPlaceholderBoxes, renderLatexToHtml } from './latexUtils';

/**
 * @typedef {Object} QuestionPart
 * @property {string} type
 * @property {string} [content]
 * @property {string} [imageUrl]
 * @property {QuestionPart[]} [children]
 * @property {boolean} [isVertical] - Defaults to false when omitted.
 * @property {boolean} [hasAudio] - Show speaker only when true.
 * @property {number} [count] - Repeat image part this many times.
 */

function renderInlineMarkdown(text) {
    const normalized = String(text ?? '');
    if (!normalized) return null;

    const tokens = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);

    return tokens.map((token, idx) => {
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
            return <strong key={`md-b-${idx}`}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
            return <em key={`md-i-${idx}`}>{token.slice(1, -1)}</em>;
        }
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
            return <code key={`md-c-${idx}`}>{token.slice(1, -1)}</code>;
        }
        return <span key={`md-t-${idx}`}>{token}</span>;
    });
}

function renderLongMultiply(part, index, styles) {
    const cfg = part?.layout || {};
    const operator = String(cfg.operator || '×');
    const top = String(cfg.top ?? cfg.multiplicand ?? '');
    const bottom = String(cfg.bottom ?? cfg.multiplier ?? '');
    const answer = String(cfg.answer ?? '');
    const answerColor = String(cfg.answerColor || '#4f57ff');
    const boxCount = Number(cfg.boxCount ?? 0);

    const explicitCols = Number(cfg.cols);
    const topChars = Array.isArray(cfg.topDigits) ? cfg.topDigits : top.split('');
    const bottomChars = Array.isArray(cfg.bottomDigits) ? cfg.bottomDigits : bottom.split('');
    const resultChars = Array.isArray(cfg.resultDigits) ? cfg.resultDigits : answer.split('');
    const autoCols = Math.max(topChars.length, bottomChars.length, resultChars.length, 1);
    const cols = Number.isFinite(explicitCols) && explicitCols > 0 ? explicitCols : autoCols;

    const toCellObject = (item, fallbackColor = '') => {
        if (item && typeof item === 'object') {
            return { value: String(item.value ?? ''), color: String(item.color || fallbackColor) };
        }
        return { value: String(item ?? ''), color: fallbackColor };
    };

    const rightAlignCells = (source, fallbackColor = '') => {
        const normalized = (Array.isArray(source) ? source : []).map((item) => toCellObject(item, fallbackColor));
        const pad = Math.max(0, cols - normalized.length);
        return [
            ...Array.from({ length: pad }).map(() => ({ value: '', color: '' })),
            ...normalized.slice(-cols),
        ];
    };

    const carrySlots = Array.from({ length: cols }).map(() => ({ value: '', color: '' }));
    const carries = Array.isArray(cfg.carries) ? cfg.carries : [];
    carries.forEach((entry) => {
        const col = Number(entry?.col);
        if (!Number.isFinite(col) || col < 0 || col >= cols) return;
        carrySlots[col] = {
            value: String(entry?.value ?? ''),
            color: String(entry?.color || '#16a34a'),
        };
    });
    const carryText = String(cfg.carry ?? '');
    if (carryText && carries.length === 0) {
        const chars = carryText.split('').map((ch) => ({ value: ch, color: '#16a34a' }));
        const aligned = rightAlignCells(chars);
        aligned.forEach((cell, idxCell) => {
            carrySlots[idxCell] = cell;
        });
    }

    const topSlots = rightAlignCells(topChars);
    const bottomFallbackColor = String(cfg.bottomColor || '');
    const topFallbackColor = String(cfg.topColor || '');
    topSlots.forEach((cell) => {
        if (!cell.color) cell.color = topFallbackColor;
    });
    const bottomSlots = rightAlignCells(bottomChars, bottomFallbackColor);
    const resultFallbackColor = String(cfg.resultColor || answerColor);
    const resultSlots = rightAlignCells(resultChars, resultFallbackColor);

    if (boxCount > 0) {
        return (
            <div key={index} className={styles.longMultiply}>
                <div className={styles.longRow}>{top}</div>
                <div className={styles.longRow}>
                    <span className={styles.longOperator}>{operator}</span>
                    <span>{bottom}</span>
                </div>
                <div className={styles.longDivider} />
                <div className={styles.longBoxes}>
                    {Array.from({ length: boxCount }).map((_, boxIdx) => (
                        <span key={`box-${index}-${boxIdx}`} className={styles.longBox}>
                            {answer[boxIdx] ?? ''}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div key={index} className={styles.longMultiplyGrid} style={{ '--long-cols': cols }}>
            <div className={styles.longCarryRow}>
                <span className={styles.longOpCell} />
                {carrySlots.map((cell, slotIdx) => (
                    <span key={`carry-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
            <div className={styles.longMathRow}>
                <span className={styles.longOpCell} />
                {topSlots.map((cell, slotIdx) => (
                    <span key={`top-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
            <div className={styles.longMathRow}>
                <span className={styles.longOpCell}>{operator}</span>
                {bottomSlots.map((cell, slotIdx) => (
                    <span key={`bot-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
            <div className={styles.longDividerRow}>
                <span className={styles.longOpCell} />
                <span className={styles.longDivider} />
            </div>
            <div className={styles.longMathRow}>
                <span className={styles.longOpCell} />
                {resultSlots.map((cell, slotIdx) => (
                    <span key={`res-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function QuestionParts({ parts }) {
    const safeParts = Array.isArray(parts) ? parts : [];
    const getRepeatCount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 1;
        return Math.min(Math.floor(parsed), 24);
    };

    const renderImageSet = (imageSrc, part, index) => {
        const repeatCount = getRepeatCount(part?.count);
        if (isInlineSvg(imageSrc)) {
            return (
                <div key={index} className={styles.svgContainer}>
                    {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                        <div
                            key={`svg-${index}-${imageIndex}`}
                            dangerouslySetInnerHTML={{ __html: imageSrc }}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div key={index} className={styles.imageContainer}>
                {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                    (() => {
                        const isAboveFoldImage = index === 0 && imageIndex === 0;
                        return (
                    <SafeImage
                        key={`img-${index}-${imageIndex}`}
                        src={imageSrc}
                        alt={`Question image ${imageIndex + 1}`}
                        className={styles.image}
                        width={320}
                        height={150}
                        style={{
                            maxWidth: part.width ? `${part.width}px` : undefined,
                            maxHeight: part.height ? `${part.height}px` : undefined,
                        }}
                        sizes="(max-width: 768px) 70vw, 320px"
                        priority={isAboveFoldImage}
                        loading={isAboveFoldImage ? 'eager' : 'lazy'}
                    />
                        );
                    })()
                ))}
            </div>
        );
    };

    const renderPartContent = (part, index) => {
        const imageSrc = getImageSrc(part?.imageUrl || part?.content);

        switch (part.type) {
            case 'text':
                if (isInlineSvg(part.content)) {
                    return (
                        <div
                            key={index}
                            className={styles.svgContainer}
                            dangerouslySetInnerHTML={{ __html: part.content }}
                        />
                    );
                }
                if (isImageUrl(part.content)) {
                    const isAboveFoldImage = index === 0;
                    return (
                        <div key={index} className={styles.imageContainer}>
                            <SafeImage
                                src={part.content}
                                alt="Question visual"
                                className={styles.urlImage}
                                width={320}
                                height={150}
                                sizes="(max-width: 768px) 70vw, 320px"
                                priority={isAboveFoldImage}
                                loading={isAboveFoldImage ? 'eager' : 'lazy'}
                            />
                        </div>
                    );
                }
                return (
                    <div key={index} className={styles.textRow}>
                        {Boolean(part?.hasAudio) && <SpeakerButton text={part.content} />}
                        {hasInlineHtml(part.content) ? (
                            <span
                                className={styles.text}
                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(part.content) }}
                            />
                        ) : (
                            <span className={styles.text}>
                                {renderInlineMarkdown(part.content)}
                            </span>
                        )}
                    </div>
                );

            case 'image':
                return renderImageSet(imageSrc, part, index);

            case 'svg':
                return (
                    <div
                        key={index}
                        className={styles.svgContainer}
                        dangerouslySetInnerHTML={{ __html: part.content }}
                    />
                );

            case 'sequence':
                return (
                    <div key={index} className={styles.sequence}>
                        {part.children.map((child, childIndex) => renderPart(child, `${index}-${childIndex}`))}
                    </div>
                );

            case 'input':
                // Input rendering handled by FillInTheBlank renderer
                return null;

            case 'math':
            case 'mathLatex': {
                const displayMode = Boolean(part?.displayMode ?? part?.isDisplayMode);
                const latex = latexWithPlaceholderBoxes(part.content);
                return (
                    <div key={index} className={`${styles.mathLatex} ${displayMode ? styles.mathLatexDisplay : ''}`}>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: renderLatexToHtml(latex, displayMode),
                            }}
                        />
                    </div>
                );
            }

            case 'math':
                return (
                    <div key={index} className={styles.mathLatex}>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: renderLatexToHtml(part.content, false),
                            }}
                        />
                    </div>
                );

            case 'mathText':
                return (
                    <span key={index} className={styles.math}>
                        {String(part.content ?? '')}
                    </span>
                );

            case 'longMultiply':
                return renderLongMultiply(part, index, styles);

            default:
                return null;
        }
    };

    const renderPart = (part, index) => {
        const content = renderPartContent(part, index);
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

    return (
        <div className={styles.container}>
            {safeParts.map((part, index) => renderPart(part, index))}
        </div>
    );
}
