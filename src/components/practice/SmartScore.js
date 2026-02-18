'use client';

import styles from './SmartScore.module.css';

export default function SmartScore({ score }) {
    const getScoreColor = () => {
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#3b82f6';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    };

    const getScoreLabel = () => {
        if (score >= 80) return 'Excellent!';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Keep Going';
        return 'Practice More';
    };

    return (
        <div className={styles.smartScore}>
            <div className={styles.scoreLabel}>SmartScore</div>
            <div className={styles.scoreDisplay}>
                <div
                    className={styles.scoreCircle}
                    style={{ '--score-color': getScoreColor() }}
                >
                    <svg className={styles.scoreRing} viewBox="0 0 100 100">
                        <circle
                            className={styles.scoreBackground}
                            cx="50"
                            cy="50"
                            r="45"
                        />
                        <circle
                            className={styles.scoreProgress}
                            cx="50"
                            cy="50"
                            r="45"
                            style={{
                                strokeDashoffset: 283 - (283 * score) / 100
                            }}
                        />
                    </svg>
                    <div className={styles.scoreValue}>{score}</div>
                </div>
                <div className={styles.scoreText}>{getScoreLabel()}</div>
            </div>
        </div>
    );
}
