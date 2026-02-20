'use client';

import QuestionParts from './QuestionParts';
import styles from './ImageChoiceRenderer.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SafeImage from './SafeImage';

export default function ImageChoiceRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    const handleOptionClick = (index) => {
        if (isAnswered) return;

        if (question.isMultiSelect) {
            const currentAnswers = userAnswer || [];
            const newAnswers = currentAnswers.includes(index)
                ? currentAnswers.filter(i => i !== index)
                : [...currentAnswers, index];
            onAnswer(newAnswers);
        } else {
            onAnswer(index);
        }
    };

    const isSelected = (index) => {
        if (question.isMultiSelect) {
            return (userAnswer || []).includes(index);
        }
        return userAnswer === index;
    };

    return (
        <div className={styles.container}>
            <div className={styles.questionCard}>
                {/* Question Parts */}
                <div className={styles.questionContent}>
                    <QuestionParts parts={question.parts} />
                </div>

                {/* Scrollable Content Wrapper */}
                <div className={styles.contentWrapper}>
                    {/* Image Options */}
                    <div className={`${styles.optionsGrid} ${question.isVertical ? styles.vertical : ''}`}>
                        {question.options.map((optionValue, index) => {
                            const src = getImageSrc(optionValue);
                            const optionText =
                                typeof optionValue === 'string'
                                    ? optionValue
                                    : optionValue?.label || optionValue?.text || '';
                            const inlineSvgMarkup = isInlineSvg(optionValue)
                                ? optionValue
                                : isInlineSvg(src)
                                    ? src
                                    : null;
                            return (
                            <button
                                key={index}
                                className={`${styles.option} ${isSelected(index) ? styles.selected : ''} ${isAnswered ? styles.disabled : ''}`}
                                onClick={() => handleOptionClick(index)}
                                disabled={isAnswered}
                            >
                                {question.isMultiSelect && (
                                    <div className={styles.checkbox}>
                                        {isSelected(index) && '✓'}
                                    </div>
                                )}
                                <div className={styles.imageWrapper}>
                                    {inlineSvgMarkup ? (
                                        <div
                                            className={styles.inlineSvg}
                                            dangerouslySetInnerHTML={{ __html: inlineSvgMarkup }}
                                        />
                                    ) : isImageUrl(src) ? (
                                        <SafeImage
                                            src={src}
                                            alt={`Option ${index + 1}`}
                                            className={styles.optionImage}
                                            width={220}
                                            height={140}
                                            sizes="(max-width: 768px) 44vw, 220px"
                                        />
                                    ) : !src ? (
                                        <span className={styles.optionFallback}>No image</span>
                                    ) : (
                                        hasInlineHtml(optionText) ? (
                                            <span
                                                className={styles.optionText}
                                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(optionText) }}
                                            />
                                        ) : (
                                            <span className={styles.optionText}>{optionText || 'No image'}</span>
                                        )
                                    )}
                                </div>
                            </button>
                            );
                        })}
                    </div>

                    {/* Submit Button (if needed) */}
                    {question.showSubmitButton && userAnswer !== null && !isAnswered && (
                        <button className={styles.submitButton} onClick={() => onSubmit()}>
                            Submit Answer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
