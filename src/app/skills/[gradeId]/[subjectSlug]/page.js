import Link from 'next/link';
import styles from './skills.module.css';
import { absoluteUrl } from '@/lib/seo';
import { getSkillsPageData } from '@/lib/curriculum/server';

export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const { gradeId, subjectSlug } = resolvedParams;
    const { grade, currentSubject } = await getSkillsPageData(gradeId, subjectSlug);

    if (!grade || !currentSubject) {
        return {
            title: 'Skills Not Found',
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const title = `${grade.name} ${currentSubject.name} Skills`;
    const description = `Explore ${currentSubject.name} skills for ${grade.name} and start interactive practice.`;
    const path = `/skills/${gradeId}/${subjectSlug}`;

  return {
        title,
        description,
        alternates: {
            canonical: path,
        },
        openGraph: {
            title,
            description,
            url: absoluteUrl(path),
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
  };
}

export default async function SkillsPage({ params }) {
    const resolvedParams = await params;
    const { gradeId, subjectSlug } = resolvedParams;
    const { grade, subjects, currentSubject, units } = await getSkillsPageData(gradeId, subjectSlug);

    if (!grade || !currentSubject) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Grade or subject not found</div>
            </div>
        );
    }

    // Group units into columns (3 columns as per WEXLS design)
    const groupedUnits = [];
    const unitsPerColumn = Math.ceil(units.length / 3);

    for (let i = 0; i < 3; i++) {
        groupedUnits.push(units.slice(i * unitsPerColumn, (i + 1) * unitsPerColumn));
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoText}>WEXLS</span>
                    </Link>
                    <nav className={styles.nav}>
                        <a href="#" className={styles.navLink}>Learning</a>
                        <a href="#" className={styles.navLink}>Analytics</a>
                    </nav>
                    <div className={styles.authButtons}>
                        <button className={styles.signInBtn}>Sign in</button>
                        <button className={styles.joinBtn}>Join now</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Sidebar with subject navigation */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarTitle}>Subjects</div>
                    {subjects.map((subject, idx) => (
                        <Link
                            key={subject.id}
                            href={`/skills/${gradeId}/${subject.slug}`}
                            className={`${styles.subjectLink} ${subject.id === currentSubject.id ? styles.active : ''}`}
                            style={{ '--subject-index': idx }}
                        >
                            <div className={styles.subjectIcon}>{subject.name.charAt(0)}</div>
                            <span>{subject.name}</span>
                        </Link>
                    ))}
                </aside>

                {/* Skills Content */}
                <main className={styles.content}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            {grade.name} {currentSubject.name}
                        </h1>
                        <p className={styles.pageDescription}>
                            Here is a list of all of the {currentSubject.name.toLowerCase()} skills students learn in {grade.name}!
                            These skills are organised into categories, and you can move your mouse over any skill name to preview the skill.
                        </p>
                    </div>

                    {/* View Tabs */}
                    <div className={styles.viewTabs}>
                        <button className={`${styles.tab} ${styles.activeTab}`}>Capsule</button>
                        <button className={styles.tab}>Topics</button>
                    </div>

                    {/* Skills Grid (3 columns) */}
                    <div className={styles.skillsGrid}>
                        {groupedUnits.map((columnUnits, colIdx) => (
                            <div key={colIdx} className={styles.skillColumn}>
                                {columnUnits.map((unit) => {
                                    const microskills = unit.microskills || [];
                                    return (
                                        <div key={unit.id} className={styles.unitSection}>
                                            <h2 className={styles.unitTitle}>{unit.name}</h2>
                                            <div className={styles.skillsList}>
                                                {microskills.map((skill) => (
                                                    <Link
                                                        key={skill.id}
                                                        href={`/practice/${skill.slug || skill.id}`}
                                                        className={styles.skillItem}
                                                    >
                                                        <span className={styles.skillCode}>{skill.code}</span>
                                                        <span className={styles.skillName}>{skill.name}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
