import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.heroContent}>
                <p className={styles.eyebrow}>Personalized Learning Platform</p>
                <h1 className={styles.heroTitle}>
                    Learning that accelerates student outcomes
                </h1>
                <p className={styles.heroSubtitle}>Adaptive practice built for every learner.</p>
                <div className={styles.ctaRow}>
                    <button className={styles.primaryCta}>Start Learning</button>
                    <button className={styles.secondaryCta}>Explore Skills</button>
                </div>
            </div>
        </section>
    );
}
