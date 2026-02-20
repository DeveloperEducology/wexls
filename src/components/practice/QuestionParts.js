'use client';

import styles from './QuestionParts.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SpeakerButton from './SpeakerButton';
import SafeImage from './SafeImage';

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
                // TODO: Implement KaTeX rendering
                return (
                    <span key={index} className={styles.math}>
                        {part.content}
                    </span>
                );

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
