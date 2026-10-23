import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { createSurvey } from './repository';
import { validateAnswers } from './model';
import type { Answer } from './types';

export const demoSurveyorUsernames = Array.from(
  { length: 5 },
  (_, i) => `demo_surveyor${String(i + 1).padStart(2, '0')}`,
);
const regions = ['banten', 'jawa-barat', 'jawa-tengah', 'jawa-timur', 'bali'];
const cities = ['Tangerang Selatan', 'Bandung', 'Semarang', 'Surabaya', 'Denpasar'];

/** Each account owns its own synthetic data; no membership in another user's workspace is granted. */
export async function seedAccountDemo(ownerId: string) {
  const db = getDb();
  const marker = `account-demo-50-v1:${ownerId}`;
  if (await db.prepare('SELECT id FROM app_migrations WHERE id = ?').get(marker)) return;
  return db.transaction(async () => {
    await db.lockOwner(ownerId);
    if (await db.prepare('SELECT id FROM app_migrations WHERE id = ?').get(marker)) return;
    const self = await db
      .prepare('SELECT user_id, username, full_name FROM surveyor_profiles WHERE user_id = ?')
      .get(ownerId);
    const team = self
      ? [self]
      : await db
          .prepare(
            `SELECT user_id, username, full_name FROM surveyor_profiles WHERE username IN (${demoSurveyorUsernames.map(() => '?').join(',')}) ORDER BY username`,
          )
          .all(...demoSurveyorUsernames);
    if (!self && team.length !== 5) throw new Error('Akun surveyor demo belum disiapkan.');
    const survey = await createSurvey(ownerId, 'DEMO — Kepuasan Layanan · 50 Responden', 'skm');
    survey.description =
      'DATA SIMULASI untuk latihan dan presentasi. Seluruh responden, jawaban, wilayah dan profil surveyor demo bersifat fiktif.';
    survey.institution = 'SurveyDash Studio — Demo';
    survey.status = 'open';
    survey.visibility = 'link';
    survey.target = 50;
    survey.demo = true;
    await db
      .prepare('UPDATE surveys SET payload = ? WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(survey), survey.id, ownerId);
    const now = new Date().toISOString();
    const assignments = team.map((person, i) => ({
      id: randomUUID(),
      token: randomUUID().replaceAll('-', ''),
      person,
      province: regions[i % regions.length],
    }));
    for (const [i, assignment] of assignments.entries()) {
      await db
        .prepare('INSERT INTO surveyor_assignments VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
        .run(
          assignment.id,
          survey.id,
          ownerId,
          assignment.person.user_id,
          assignment.token,
          ownerId,
          now,
          now,
        );
      await db
        .prepare('INSERT INTO surveyor_assignment_regions VALUES (?, ?, ?, ?)')
        .run(assignment.id, assignment.province, ownerId, now);
      await db
        .prepare('INSERT INTO fieldwork_details VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(assignment.id, ownerId, cities[i], 'Wilayah Demo', 50 / team.length, ownerId, now);
      await db
        .prepare('INSERT INTO survey_province_targets VALUES (?, ?, ?, ?, ?)')
        .run(survey.id, assignment.province, 50 / team.length, ownerId, now);
    }
    const submissions: (string | number | null)[][] = [];
    const attributions: (string | number | null)[][] = [];
    const locations: (string | number | null)[][] = [];
    const timings: (string | number | null)[][] = [];
    const reviews: (string | number | null)[][] = [];
    for (let i = 0; i < 50; i++) {
      const assignment = assignments[i % assignments.length];
      const answers: Record<string, Answer> = {};
      survey.questions.forEach((q, qi) => {
        if (q.id === 'name') answers[q.id] = `Responden Demo ${String(i + 1).padStart(2, '0')}`;
        else if (q.id === 'feedback')
          answers[q.id] = [
            'Demo: petugas ramah dan membantu.',
            'Demo: informasi prosedur perlu diperjelas.',
            'Demo: waktu tunggu dapat diperbaiki.',
            'Demo: fasilitas cukup nyaman.',
            'Demo: pelayanan cepat dan memuaskan.',
          ][i % 5];
        else if (q.scored)
          answers[q.id] = q.options[[3, 3, 2, 3, 2, 1, 3, 2, 3, 0][(i * 7 + qi * 3) % 10]].id;
        else answers[q.id] = q.options[(i + qi) % q.options.length].id;
      });
      const valid = validateAnswers(survey.questions, answers);
      const id = randomUUID();
      const time = new Date(Date.now() - (6 - (i % 7)) * 86400000 - (50 - i) * 180000).toISOString();
      submissions.push([
        id,
        survey.id,
        JSON.stringify(valid),
        JSON.stringify(survey.questions),
        time,
        `account-demo-${i + 1}`,
      ]);
      attributions.push([
        id,
        assignment.id,
        assignment.person.user_id,
        assignment.person.username,
        assignment.person.full_name,
      ]);
      locations.push([id, assignment.province, time]);
      const duration = 150 + ((i * 37) % 300);
      timings.push([id, new Date(Date.parse(time) - duration * 1000).toISOString(), time, duration]);
      reviews.push([
        id,
        survey.id,
        'valid',
        'Data simulasi untuk demo, bukan hasil survei nyata.',
        1,
        ownerId,
        now,
      ]);
    }
    async function insert(sql: string, rows: (string | number | null)[][]) {
      await db
        .prepare(sql + rows.map((row) => `(${row.map(() => '?').join(',')})`).join(','))
        .run(...rows.flat());
    }
    await insert(
      'INSERT INTO submissions(id, survey_id, answers, snapshot, submitted_at, request_key) VALUES ',
      submissions,
    );
    await insert('INSERT INTO submission_attribution VALUES ', attributions);
    await insert('INSERT INTO submission_regions VALUES ', locations);
    await insert('INSERT INTO submission_timing VALUES ', timings);
    await insert('INSERT INTO cleaning_reviews VALUES ', reviews);
    await db.prepare('INSERT INTO app_migrations VALUES (?, ?)').run(marker, now);
    return survey.id;
  });
}

export async function ensureAutomaticDemo(ownerId: string) {
  if (process.env.STUDIO_AUTO_DEMO === 'true') await seedAccountDemo(ownerId);
}
