'use client';

import styles from './FourPicsRenderer.module.css';
import QuestionParts from './QuestionParts';
import { getImageSrc, isImageUrl, isInlineSvg } from './contentUtils';
import { useEffect, useMemo, useState } from 'react';
import SafeImage from './SafeImage';

export default function FourPicsRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    const safeParts = Array.isArray(question?.parts) ? question.parts : [];
    const textParts = safeParts.filter((part) => part?.type !== 'image');
    const firstImagePart = safeParts.find((part) => part?.type === 'image');
    const imageSrc = firstImagePart ? getImageSrc(firstImagePart.imageUrl || firstImagePart.content) : '';
    const letterBank = useMemo(() => {
        const fromPayload = Array.isArray(question?.letterBank)
            ? question.letterBank.map((ch) => String(ch ?? '').slice(0, 1).toUpperCase()).filter(Boolean)
            : [];
        if (fromPayload.length > 0) return fromPayload;
        return [];
    }, [question?.letterBank, question?.id]);
    const slotCount = useMemo(() => {
        const configured = Number(question?.wordLength);
        if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
        return letterBank.length;
    }, [question?.wordLength, letterBank.length]);
    const [slots, setSlots] = useState([]);

    useEffect(() => {
        const normalized = Array.from({ length: slotCount }, (_, idx) => {
            const value = String(userAnswer ?? '').toUpperCase();
            return value[idx] || '';
        });
        setSlots(normalized);
    }, [question?.id, slotCount]);

    const usedIndices = useMemo(() => {
        const used = new Set();
        slots.forEach((slotChar) => {
            if (!slotChar) return;
            const idx = letterBank.findIndex((ch, i) => ch === slotChar && !used.has(i));
            if (idx >= 0) used.add(idx);
        });
        return used;
    }, [slots, letterBank]);

    const pushAnswer = (nextSlots) => {
        const nextWord = nextSlots.join('');
        onAnswer(nextWord);
    };

    const placeLetter = (bankIndex) => {
        if (isAnswered) return;
        const nextEmpty = slots.findIndex((ch) => !ch);
        if (nextEmpty < 0) return;
        const next = [...slots];
        next[nextEmpty] = letterBank[bankIndex];
        setSlots(next);
        pushAnswer(next);
    };

    const clearSlot = (slotIndex) => {
        if (isAnswered) return;
        const next = [...slots];
        next[slotIndex] = '';
        setSlots(next);
        pushAnswer(next);
    };

    const canSubmit = slots.length > 0 && slots.every((ch) => Boolean(ch));

    return (
        <div className={styles.container}>
            <div className={styles.questionCard}>
                <div className={styles.questionContent}>
                    <QuestionParts parts={textParts} />
                </div>

                {firstImagePart && (
                    <div className={styles.imageContainer}>
                        {isInlineSvg(imageSrc) ? (
                            <div
                                className={styles.inlineSvg}
                                dangerouslySetInnerHTML={{ __html: imageSrc }}
                            />
                        ) : isImageUrl(imageSrc) ? (
                            <SafeImage
                                src={imageSrc}
                                alt="Question visual"
                                className={styles.image}
                                width={280}
                                height={170}
                                sizes="(max-width: 768px) 56vw, 280px"
                            />
                        ) : null}
                    </div>
                )}

                <div className={styles.blankRow}>
                    {Array.from({ length: slotCount }).map((_, idx) => (
                        <button
                            key={`slot-${idx}`}
                            type="button"
                            className={`${styles.blank} ${slots[idx] ? styles.blankFilled : ''}`}
                            onClick={() => clearSlot(idx)}
                            disabled={isAnswered}
                        >
                            {slots[idx] || ''}
                        </button>
                    ))}
                </div>

                <div className={styles.letterBank}>
                    {letterBank.map((letter, idx) => {
                        const used = usedIndices.has(idx);
                        return (
                            <button
                                key={`letter-${idx}`}
                                type="button"
                                className={styles.letter}
                                onClick={() => placeLetter(idx)}
                                disabled={isAnswered || used || !slotCount}
                            >
                                {letter}
                            </button>
                        );
                    })}
                </div>

                {question.showSubmitButton && canSubmit && !isAnswered && (
                    <button className={styles.submitButton} onClick={() => onSubmit(slots.join(''))}>
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}
