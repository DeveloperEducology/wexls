'use client';

import QuestionParts from './QuestionParts';
import styles from './MCQRenderer.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SafeImage from './SafeImage';

export default function MCQRenderer({
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

                {/* Options */}
                <div className={`${styles.optionsGrid} ${question.isVertical ? styles.vertical : ''}`}>
                    {question.options.map((option, index) => (
                        (() => {
                            const optionImageSrc = getImageSrc(option);
                            const optionText = typeof option === 'string' ? option : option?.label || option?.text || '';

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
                            {isInlineSvg(option) ? (
                                <div
                                    className={styles.optionMedia}
                                    dangerouslySetInnerHTML={{ __html: option }}
                                />
                            ) : isImageUrl(optionImageSrc) ? (
                                <SafeImage
                                    src={optionImageSrc}
                                    alt={`Option ${index + 1}`}
                                    className={styles.optionImage}
                                    width={220}
                                    height={140}
                                    sizes="(max-width: 768px) 40vw, 220px"
                                />
                            ) : (
                                hasInlineHtml(optionText) ? (
                                    <span
                                        className={styles.optionText}
                                        dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(optionText) }}
                                    />
                                ) : (
                                    <span className={styles.optionText}>{optionText}</span>
                                )
                            )}
                        </button>
                            );
                        })()
                    ))}
                </div>

                {/* Submit Button (if needed) */}
                {question.showSubmitButton && userAnswer !== null && !isAnswered && (
                    <button className={styles.submitButton} onClick={() => onSubmit()}>
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}
