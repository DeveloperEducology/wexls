'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './teacher-analytics.module.css';

function toPoints(values, width = 520, height = 140, pad = 16) {
  if (!Array.isArray(values) || values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values.map((v, i) => {
    const x = pad + (i * ((width - pad * 2) / Math.max(1, values.length - 1)));
    const y = height - pad - (((v - min) / range) * (height - pad * 2));
    return `${x},${y}`;
  }).join(' ');
}

export default function TeacherAnalyticsClient({ initialStudentId = '', initialMicroSkillId = '' }) {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [microSkillId, setMicroSkillId] = useState(initialMicroSkillId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchData = async () => {
    if (!studentId || !microSkillId) {
      setError('studentId and microSkillId are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/adaptive/analytics/score-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, microSkillId, limit: 40 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load analytics.');
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  const rows = data?.rows || [];
  const summary = useMemo(() => {
    if (!rows.length) return null;
    const correct = rows.filter((r) => r.isCorrect).length;
    const accuracy = Math.round((correct / rows.length) * 100);
    const avgDelta = Math.round(rows.reduce((acc, r) => acc + Number(r.estimatedDelta || 0), 0) / rows.length);
    const avgMs = Math.round(rows.reduce((acc, r) => acc + Number(r.factors?.responseMs || 0), 0) / rows.length);
    return { accuracy, avgDelta, avgMs, attempts: rows.length };
  }, [rows]);

  const accuracySeries = rows.map((r) => (r.isCorrect ? 100 : 0)).reverse();
  const deltaSeries = rows.map((r) => Number(r.estimatedDelta || 0)).reverse();
  const speedSeries = rows.map((r) => Number(r.factors?.responseMs || 0)).reverse();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Teacher Analytics</h1>
        <Link href="/" className={styles.homeLink}>Back Home</Link>
      </div>

      <div className={styles.controls}>
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student UUID" />
        <input value={microSkillId} onChange={(e) => setMicroSkillId(e.target.value)} placeholder="MicroSkill UUID or slug" />
        <button onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'Load Analytics'}</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {summary && (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}><span>Attempts</span><strong>{summary.attempts}</strong></div>
            <div className={styles.kpi}><span>Accuracy</span><strong>{summary.accuracy}%</strong></div>
            <div className={styles.kpi}><span>Avg Delta</span><strong>{summary.avgDelta > 0 ? `+${summary.avgDelta}` : summary.avgDelta}</strong></div>
            <div className={styles.kpi}><span>Avg Time</span><strong>{summary.avgMs} ms</strong></div>
          </div>

          <div className={styles.charts}>
            <div className={styles.chartCard}>
              <h3>Accuracy Trend</h3>
              <svg viewBox="0 0 520 140" className={styles.chart}>
                <polyline points={toPoints(accuracySeries)} fill="none" stroke="#22c55e" strokeWidth="3" />
              </svg>
            </div>
            <div className={styles.chartCard}>
              <h3>SmartScore Delta Trend</h3>
              <svg viewBox="0 0 520 140" className={styles.chart}>
                <polyline points={toPoints(deltaSeries)} fill="none" stroke="#0ea5e9" strokeWidth="3" />
              </svg>
            </div>
            <div className={styles.chartCard}>
              <h3>Response Time Trend</h3>
              <svg viewBox="0 0 520 140" className={styles.chart}>
                <polyline points={toPoints(speedSeries)} fill="none" stroke="#f97316" strokeWidth="3" />
              </svg>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Qn</th>
                  <th>Correct</th>
                  <th>Delta</th>
                  <th>Phase</th>
                  <th>Difficulty</th>
                  <th>Response (ms)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleTimeString()}</td>
                    <td>{String(row.questionId).slice(0, 8)}...</td>
                    <td>{row.isCorrect ? 'Yes' : 'No'}</td>
                    <td>{row.estimatedDelta > 0 ? `+${row.estimatedDelta}` : row.estimatedDelta}</td>
                    <td>{row.factors?.phase}</td>
                    <td>{row.factors?.difficulty}</td>
                    <td>{row.factors?.responseMs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
