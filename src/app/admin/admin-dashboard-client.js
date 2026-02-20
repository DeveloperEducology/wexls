'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

const DEFAULT_Q_PARTS = JSON.stringify([
  { type: 'text', content: 'Write your question here', isVertical: true, hasAudio: true },
], null, 2);

const DEFAULT_Q_OPTIONS = JSON.stringify(['A', 'B', 'C', 'D'], null, 2);

function sortByOrder(list = []) {
  return [...list].sort((a, b) => {
    const ao = Number(a?.sort_order ?? a?.idx ?? 0);
    const bo = Number(b?.sort_order ?? b?.idx ?? 0);
    if (ao !== bo) return ao - bo;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [catalog, setCatalog] = useState({ grades: [], subjects: [], units: [], microskills: [] });
  const [questions, setQuestions] = useState([]);

  const [gradeForm, setGradeForm] = useState({ name: '', code: '', sort_order: 0 });
  const [subjectForm, setSubjectForm] = useState({ grade_id: '', name: '', slug: '', sort_order: 0 });
  const [unitForm, setUnitForm] = useState({ subject_id: '', name: '', sort_order: 0 });
  const [skillForm, setSkillForm] = useState({ unit_id: '', code: '', name: '', slug: '', sort_order: 0 });
  const [questionForm, setQuestionForm] = useState({
    microSkillId: '',
    type: 'mcq',
    difficulty: 'easy',
    complexity: 10,
    marks: 1,
    sort_order: 0,
    is_multi_select: false,
    show_submit_button: false,
    parts: DEFAULT_Q_PARTS,
    options: DEFAULT_Q_OPTIONS,
    items: '[]',
    correct_answer_index: 0,
    correct_answer_indices: '[]',
    correct_answer_text: '',
    solution: '',
    adaptive_config: '{\n  "conceptTags": ["sample_tag"]\n}',
  });

  const subjectsByGrade = useMemo(() => {
    const acc = {};
    for (const subject of catalog.subjects || []) {
      const gid = String(subject.grade_id || '');
      if (!acc[gid]) acc[gid] = [];
      acc[gid].push(subject);
    }
    return acc;
  }, [catalog.subjects]);

  const unitsBySubject = useMemo(() => {
    const acc = {};
    for (const unit of catalog.units || []) {
      const sid = String(unit.subject_id || '');
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(unit);
    }
    return acc;
  }, [catalog.units]);

  const microskillsByUnit = useMemo(() => {
    const acc = {};
    for (const skill of catalog.microskills || []) {
      const uid = String(skill.unit_id || '');
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(skill);
    }
    return acc;
  }, [catalog.microskills]);

  const loadCatalog = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/curriculum', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load catalog');
      setCatalog({
        grades: sortByOrder(payload.grades || []),
        subjects: sortByOrder(payload.subjects || []),
        units: sortByOrder(payload.units || []),
        microskills: sortByOrder(payload.microskills || []),
      });
      setSuccess('Catalog loaded');
    } catch (err) {
      setError(err?.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const createEntity = async (entity, data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, ...data }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Failed to create ${entity}`);
      await loadCatalog();
      setSuccess(`${entity} created`);
    } catch (err) {
      setError(err?.message || `Failed to create ${entity}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntity = async (entity, id) => {
    if (!confirm(`Delete ${entity} item ${String(id).slice(0, 8)}...?`)) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Failed to delete ${entity}`);
      await loadCatalog();
      setSuccess(`${entity} deleted`);
    } catch (err) {
      setError(err?.message || `Failed to delete ${entity}`);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (microSkillId) => {
    const id = String(microSkillId || '').trim();
    if (!id) {
      setError('Select a microskill to load questions.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/questions?microSkillId=${encodeURIComponent(id)}&limit=120`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load questions');
      setQuestions(payload.rows || []);
      setSuccess(`Loaded ${payload.rows?.length || 0} question(s)`);
    } catch (err) {
      setQuestions([]);
      setError(err?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const body = {
        microSkillId: questionForm.microSkillId,
        type: questionForm.type,
        difficulty: questionForm.difficulty,
        complexity: Number(questionForm.complexity || 0),
        marks: Number(questionForm.marks || 1),
        sort_order: Number(questionForm.sort_order || 0),
        is_multi_select: Boolean(questionForm.is_multi_select),
        show_submit_button: Boolean(questionForm.show_submit_button),
        parts: questionForm.parts,
        options: questionForm.options,
        items: questionForm.items,
        correct_answer_index: Number(questionForm.correct_answer_index),
        correct_answer_indices: questionForm.correct_answer_indices,
        correct_answer_text: questionForm.correct_answer_text,
        solution: questionForm.solution,
        adaptive_config: questionForm.adaptive_config,
      };

      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create question');

      await loadQuestions(questionForm.microSkillId);
      setSuccess('Question created');
    } catch (err) {
      setError(err?.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (id) => {
    if (!confirm(`Delete question ${String(id).slice(0, 8)}...?`)) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to delete question');
      await loadQuestions(questionForm.microSkillId);
      setSuccess('Question deleted');
    } catch (err) {
      setError(err?.message || 'Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Create and manage grades, subjects, units, microskills, and questions.</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={loadCatalog} disabled={loading}>{loading ? 'Loading...' : 'Load Data'}</button>
          <Link href="/">Back Home</Link>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.grid4}>
        <article className={styles.card}>
          <h2>Create Grade</h2>
          <input placeholder="Name" value={gradeForm.name} onChange={(e) => setGradeForm((v) => ({ ...v, name: e.target.value }))} />
          <input placeholder="Code" value={gradeForm.code} onChange={(e) => setGradeForm((v) => ({ ...v, code: e.target.value }))} />
          <input type="number" placeholder="Sort Order" value={gradeForm.sort_order} onChange={(e) => setGradeForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
          <button onClick={() => createEntity('grades', gradeForm)} disabled={loading}>Create Grade</button>
        </article>

        <article className={styles.card}>
          <h2>Create Subject</h2>
          <select value={subjectForm.grade_id} onChange={(e) => setSubjectForm((v) => ({ ...v, grade_id: e.target.value }))}>
            <option value="">Select grade</option>
            {catalog.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
          </select>
          <input placeholder="Name" value={subjectForm.name} onChange={(e) => setSubjectForm((v) => ({ ...v, name: e.target.value }))} />
          <input placeholder="Slug" value={subjectForm.slug} onChange={(e) => setSubjectForm((v) => ({ ...v, slug: e.target.value }))} />
          <input type="number" placeholder="Sort Order" value={subjectForm.sort_order} onChange={(e) => setSubjectForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
          <button onClick={() => createEntity('subjects', subjectForm)} disabled={loading}>Create Subject</button>
        </article>

        <article className={styles.card}>
          <h2>Create Unit</h2>
          <select value={unitForm.subject_id} onChange={(e) => setUnitForm((v) => ({ ...v, subject_id: e.target.value }))}>
            <option value="">Select subject</option>
            {catalog.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <input placeholder="Name" value={unitForm.name} onChange={(e) => setUnitForm((v) => ({ ...v, name: e.target.value }))} />
          <input type="number" placeholder="Sort Order" value={unitForm.sort_order} onChange={(e) => setUnitForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
          <button onClick={() => createEntity('units', unitForm)} disabled={loading}>Create Unit</button>
        </article>

        <article className={styles.card}>
          <h2>Create Microskill</h2>
          <select value={skillForm.unit_id} onChange={(e) => setSkillForm((v) => ({ ...v, unit_id: e.target.value }))}>
            <option value="">Select unit</option>
            {catalog.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
          <input placeholder="Code" value={skillForm.code} onChange={(e) => setSkillForm((v) => ({ ...v, code: e.target.value }))} />
          <input placeholder="Name" value={skillForm.name} onChange={(e) => setSkillForm((v) => ({ ...v, name: e.target.value }))} />
          <input placeholder="Slug" value={skillForm.slug} onChange={(e) => setSkillForm((v) => ({ ...v, slug: e.target.value }))} />
          <input type="number" placeholder="Sort Order" value={skillForm.sort_order} onChange={(e) => setSkillForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
          <button onClick={() => createEntity('microskills', skillForm)} disabled={loading}>Create Microskill</button>
        </article>
      </section>

      <section className={styles.catalogSection}>
        <h2>Curriculum Tree</h2>
        <div className={styles.treeWrap}>
          {catalog.grades.map((grade) => (
            <div key={grade.id} className={styles.treeGrade}>
              <div className={styles.treeLine}>
                <strong>{grade.name}</strong>
                <button onClick={() => deleteEntity('grades', grade.id)}>Delete</button>
              </div>
              {(subjectsByGrade[String(grade.id)] || []).map((subject) => (
                <div key={subject.id} className={styles.treeSubject}>
                  <div className={styles.treeLine}>
                    <span>{subject.name}</span>
                    <button onClick={() => deleteEntity('subjects', subject.id)}>Delete</button>
                  </div>
                  {(unitsBySubject[String(subject.id)] || []).map((unit) => (
                    <div key={unit.id} className={styles.treeUnit}>
                      <div className={styles.treeLine}>
                        <span>{unit.name}</span>
                        <button onClick={() => deleteEntity('units', unit.id)}>Delete</button>
                      </div>
                      {(microskillsByUnit[String(unit.id)] || []).map((skill) => (
                        <div key={skill.id} className={styles.treeSkill}>
                          <div className={styles.treeLine}>
                            <span>{skill.code || 'Skill'} - {skill.name}</span>
                            <button onClick={() => deleteEntity('microskills', skill.id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.questionsSection}>
        <h2>Question Builder</h2>
        <div className={styles.qControls}>
          <select value={questionForm.microSkillId} onChange={(e) => setQuestionForm((v) => ({ ...v, microSkillId: e.target.value }))}>
            <option value="">Select microskill</option>
            {catalog.microskills.map((skill) => (
              <option key={skill.id} value={skill.id}>{skill.code || 'Skill'} - {skill.name}</option>
            ))}
          </select>
          <button onClick={() => loadQuestions(questionForm.microSkillId)} disabled={loading}>Load Questions</button>
        </div>

        <div className={styles.qFormGrid}>
          <select value={questionForm.type} onChange={(e) => setQuestionForm((v) => ({ ...v, type: e.target.value }))}>
            {['mcq', 'imageChoice', 'fillInTheBlank', 'textInput', 'sorting', 'dragAndDrop', 'measure', 'fourPicsOneWord'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={questionForm.difficulty} onChange={(e) => setQuestionForm((v) => ({ ...v, difficulty: e.target.value }))}>
            {['easy', 'medium', 'hard'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="number" placeholder="Complexity" value={questionForm.complexity} onChange={(e) => setQuestionForm((v) => ({ ...v, complexity: Number(e.target.value || 0) }))} />
          <input type="number" placeholder="Marks" value={questionForm.marks} onChange={(e) => setQuestionForm((v) => ({ ...v, marks: Number(e.target.value || 1) }))} />
          <input type="number" placeholder="Sort Order" value={questionForm.sort_order} onChange={(e) => setQuestionForm((v) => ({ ...v, sort_order: Number(e.target.value || 0) }))} />
          <input type="number" placeholder="Correct index" value={questionForm.correct_answer_index} onChange={(e) => setQuestionForm((v) => ({ ...v, correct_answer_index: Number(e.target.value || -1) }))} />
          <label className={styles.check}><input type="checkbox" checked={questionForm.is_multi_select} onChange={(e) => setQuestionForm((v) => ({ ...v, is_multi_select: e.target.checked }))} /> Multi-select</label>
          <label className={styles.check}><input type="checkbox" checked={questionForm.show_submit_button} onChange={(e) => setQuestionForm((v) => ({ ...v, show_submit_button: e.target.checked }))} /> Show submit</label>
        </div>

        <textarea rows={6} placeholder="parts JSON" value={questionForm.parts} onChange={(e) => setQuestionForm((v) => ({ ...v, parts: e.target.value }))} />
        <textarea rows={4} placeholder="options JSON" value={questionForm.options} onChange={(e) => setQuestionForm((v) => ({ ...v, options: e.target.value }))} />
        <textarea rows={3} placeholder="items JSON" value={questionForm.items} onChange={(e) => setQuestionForm((v) => ({ ...v, items: e.target.value }))} />
        <textarea rows={3} placeholder="correct_answer_indices JSON" value={questionForm.correct_answer_indices} onChange={(e) => setQuestionForm((v) => ({ ...v, correct_answer_indices: e.target.value }))} />
        <textarea rows={5} placeholder="adaptive_config JSON" value={questionForm.adaptive_config} onChange={(e) => setQuestionForm((v) => ({ ...v, adaptive_config: e.target.value }))} />
        <input placeholder="correct_answer_text" value={questionForm.correct_answer_text} onChange={(e) => setQuestionForm((v) => ({ ...v, correct_answer_text: e.target.value }))} />
        <textarea rows={3} placeholder="solution" value={questionForm.solution} onChange={(e) => setQuestionForm((v) => ({ ...v, solution: e.target.value }))} />
        <button onClick={createQuestion} disabled={loading || !questionForm.microSkillId}>Create Question</button>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Id</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Sort</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td>{String(q.id).slice(0, 8)}...</td>
                  <td>{q.type}</td>
                  <td>{q.difficulty}</td>
                  <td>{q.sort_order ?? q.idx ?? 0}</td>
                  <td><button onClick={() => deleteQuestion(q.id)}>Delete</button></td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={5}>No questions loaded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
