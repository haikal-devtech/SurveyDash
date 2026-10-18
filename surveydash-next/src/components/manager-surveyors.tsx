'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Plus, UsersRound } from 'lucide-react';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';
import { EmptyState } from './ui';
import { SurveyorAssignments } from './surveyor-assignments';
import '@/app/manager-surveyors.css';

interface SurveyGroup {
  surveyId: string;
  title: string;
  assignments: ManagedSurveyorAssignment[];
}

export function ManagerSurveyors({
  surveys,
  initialSurveyId,
}: {
  surveys: SurveyGroup[];
  initialSurveyId?: string;
}) {
  const [selectedId, setSelectedId] = useState(
    surveys.some((survey) => survey.surveyId === initialSurveyId)
      ? initialSurveyId!
      : (surveys[0]?.surveyId ?? ''),
  );
  const selected = surveys.find((survey) => survey.surveyId === selectedId);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Surveyor</h1>
          <p>Pilih survei, lalu bagikan undangannya.</p>
        </div>
      </div>
      {!surveys.length ? (
        <section className="card">
          <EmptyState
            icon={<UsersRound size={26} />}
            title="Buat survei terlebih dahulu"
            description="Setelah itu, undang surveyor untuk membantu membagikannya."
          >
            <Link href="/studio/surveys" className="btn btn-primary">
              <Plus size={16} />
              Buat survei
            </Link>
          </EmptyState>
        </section>
      ) : (
        <>
          <div className="card manager-surveyor-picker">
            <div className="field">
              <label htmlFor="manager-surveyor-survey">Survei</label>
              <select
                id="manager-surveyor-survey"
                className="input"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {surveys.map((survey) => (
                  <option value={survey.surveyId} key={survey.surveyId}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <Link className="btn btn-secondary" href={`/studio/${selected.surveyId}`}>
                Buka survei
                <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
          {selected && (
            <section className="manager-surveyor-selected" aria-label={`Surveyor untuk ${selected.title}`}>
              <h2>{selected.title}</h2>
              <SurveyorAssignments
                key={selected.surveyId}
                surveyId={selected.surveyId}
                initialAssignments={selected.assignments}
              />
            </section>
          )}
        </>
      )}
    </>
  );
}
