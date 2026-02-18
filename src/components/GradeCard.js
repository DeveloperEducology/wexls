import Link from 'next/link';
import styles from './GradeCard.module.css';

export default function GradeCard({ grade, index, subjects = [] }) {
  const { name, color_hex, id } = grade;

  return (
    <div
      className={styles.gradeCard}
      style={{
        '--card-color': color_hex,
        animationDelay: `${index * 0.1}s`
      }}
    >
      <div className={styles.cardHeader}>
        <div
          className={styles.gradeBadge}
          style={{ backgroundColor: color_hex }}
        >
          {name}
        </div>
      </div>

      <div className={styles.cardContent}>
        <p className={styles.description}>
          Master essential skills and build a strong foundation in core subjects
        </p>

        <div className={styles.subjectsContainer}>
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/skills/${id}/${subject.slug}`}
              className={styles.subjectItem}
            >
              <span className={styles.subjectName}>{subject.name}</span>
              <span className={styles.skillCount}>{subject.skillCount} skills ›</span>
            </Link>
          ))}

          {subjects.length === 0 && (
            <p className={styles.noSubjects}>No subjects available</p>
          )}
        </div>
      </div>
    </div>
  );
}
