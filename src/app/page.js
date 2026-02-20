import Hero from '@/components/Hero';
import GradeCard from '@/components/GradeCard';
import HomeAuthStatus from '@/components/HomeAuthStatus';
import styles from './page.module.css';
import { getHomeGradesData } from '@/lib/curriculum/server';
import Link from 'next/link';

export const metadata = {
  title: 'Home',
  description: 'Browse grades and start adaptive practice skills in math, science, and english.',
  alternates: {
    canonical: '/',
  },
};

export default async function Home() {
  const grades = await getHomeGradesData();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoText}>WEXLS</span>
          </div>
          <nav className={styles.nav}>
            <a href="#" className={styles.navLink}>Learning</a>
            <a href="#" className={styles.navLink}>Analytics</a>
            <Link href="/admin" className={styles.navLink}>Admin</Link>
          </nav>
          <div className={styles.authButtons}>
            <HomeAuthStatus />
          </div>
        </div>
      </header>

      <Hero />

      <section className={styles.gradesSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>
            Choose your grade level
          </h2>
          <p className={styles.sectionSubtitle}>
            Start your personalized learning journey today
          </p>

          <div className={styles.gradesGrid}>
            {grades.map((grade, index) => (
              <GradeCard
                key={grade.id}
                grade={grade}
                index={index}
                subjects={grade.subjects || []}
              />
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>© 2026 WEXLS Learning. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
