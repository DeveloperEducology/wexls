'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [selectedStudent, setSelectedStudent] = useState(initialStudentId);
  const [selectedMicroSkill, setSelectedMicroSkill] = useState(initialMicroSkillId);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [phase, setPhase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [optionData, setOptionData] = useState({ studentOptions: [], microSkillOptions: [] });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = async () => {
    if (!studentId || !microSkillId) {
      setError('studentId and microSkillId are required.');
      return;
    }
    setLoading(true);
    setHasLoaded(true);
    setError('');
    try {
      const res = await fetch('/api/adaptive/analytics/score-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          microSkillId,
          limit: 80,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          phase: phase || undefined,
        }),
      });
      const raw = await res.text();
      let payload = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = { error: raw || `Request failed with status ${res.status}` };
      }
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
  const diagnostics = data?.diagnostics || null;
  const adaptiveSummary = data?.summary || null;
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

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const res = await fetch('/api/adaptive/analytics/options', { cache: 'no-store' });
        const raw = await res.text();
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          payload = {};
        }
        if (!res.ok || !active) return;
        setOptionData({
          studentOptions: payload.studentOptions || [],
          microSkillOptions: payload.microSkillOptions || [],
        });
      } catch {
        if (!active) return;
      }
    };

    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialStudentId && initialMicroSkillId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudentId, initialMicroSkillId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Teacher Analytics</h1>
        <Link href="/" className={styles.homeLink}>Back Home</Link>
      </div>

      <div className={styles.controls}>
        <select
          value={selectedStudent}
          onChange={(e) => {
            setSelectedStudent(e.target.value);
            setStudentId(e.target.value);
          }}
          aria-label="Student picker"
        >
          <option value="">Select student</option>
          {optionData.studentOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.id}</option>
          ))}
        </select>

        <select
          value={selectedMicroSkill}
          onChange={(e) => {
            setSelectedMicroSkill(e.target.value);
            setMicroSkillId(e.target.value);
          }}
          aria-label="Micro skill picker"
        >
          <option value="">Select micro skill</option>
          {optionData.microSkillOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {(item.code ? `${item.code} - ` : '') + item.name} ({item.usageCount})
            </option>
          ))}
        </select>

        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student UUID" />
        <input value={microSkillId} onChange={(e) => setMicroSkillId(e.target.value)} placeholder="MicroSkill UUID or slug" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
        <select value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Phase filter">
          <option value="">All phases</option>
          <option value="warmup">warmup</option>
          <option value="core">core</option>
          <option value="challenge">challenge</option>
          <option value="recovery">recovery</option>
          <option value="done">done</option>
        </select>
        <button onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'Load Analytics'}</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {hasLoaded && !loading && !error && rows.length === 0 && (
        <div className={styles.emptyWrap}>
          <p className={styles.emptyText}>
            No analytics rows found for this student + microskill + filter range.
          </p>
          {diagnostics?.dateFilteredOut && diagnostics?.firstAttemptAt && diagnostics?.lastAttemptAt ? (
            <p className={styles.hintText}>
              Data exists outside this date window.
              Range: {new Date(diagnostics.firstAttemptAt).toLocaleString()} to {new Date(diagnostics.lastAttemptAt).toLocaleString()}.
            </p>
          ) : null}
        </div>
      )}

      {summary && (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}><span>Attempts</span><strong>{summary.attempts}</strong></div>
            <div className={styles.kpi}><span>Accuracy</span><strong>{summary.accuracy}%</strong></div>
            <div className={styles.kpi}><span>Avg Delta</span><strong>{summary.avgDelta > 0 ? `+${summary.avgDelta}` : summary.avgDelta}</strong></div>
            <div className={styles.kpi}><span>Avg Time</span><strong>{summary.avgMs} ms</strong></div>
          </div>

          {adaptiveSummary && (
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <span>Recovery Entries</span>
                <strong>{adaptiveSummary.recoveryFunnel?.entries ?? 0}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Recovery Exits</span>
                <strong>{adaptiveSummary.recoveryFunnel?.successfulExits ?? 0}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Avg Attempts To Exit</span>
                <strong>{adaptiveSummary.recoveryFunnel?.avgAttemptsToExit ?? 0}</strong>
              </div>
              <div className={styles.kpi}>
                <span>Remediation Hit Rate</span>
                <strong>
                  {(() => {
                    const hits = Number(adaptiveSummary.remediationHits ?? 0);
                    const misses = Number(adaptiveSummary.remediationMisses ?? 0);
                    const total = hits + misses;
                    if (total <= 0) return '0%';
                    return `${Math.round((hits / total) * 100)}%`;
                  })()}
                </strong>
              </div>
            </div>
          )}

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

            {adaptiveSummary && (
              <div className={styles.chartCard}>
                <h3>Phase Distribution</h3>
                <div className={styles.legendList}>
                  {Object.entries(adaptiveSummary.phaseCounts || {}).map(([phase, count]) => (
                    <div key={phase} className={styles.legendItem}>
                      <span className={styles.legendLabel}>{phase}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adaptiveSummary && (
              <div className={styles.chartCard}>
                <h3>Top Misconceptions</h3>
                {Array.isArray(adaptiveSummary.topMisconceptions) && adaptiveSummary.topMisconceptions.length > 0 ? (
                  <div className={styles.legendList}>
                    {adaptiveSummary.topMisconceptions.map((item) => (
                      <div key={item.code} className={styles.legendItem}>
                        <span className={styles.legendLabel}>{item.code}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyText}>No misconception signals yet.</p>
                )}
              </div>
            )}
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
                  <th>Reason</th>
                  <th>Misconception</th>
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
                    <td>{row.selectionMeta?.reason || '-'}</td>
                    <td>{row.factors?.misconceptionCode || '-'}</td>
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
