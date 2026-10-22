export function SurveyorTaskProgress({ responseCount }: Readonly<{ responseCount: number }>) {
  return (
    <div className="surveyor-task-progress" data-tour="surveyor-progress">
      <strong>{responseCount.toLocaleString('id-ID')}</strong>
      <div>
        <span>Responden di survei ini</span>
        <small>Jawaban masuk melalui link Anda</small>
      </div>
    </div>
  );
}
