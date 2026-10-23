export function downloadDraft(value: unknown, title: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = (title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 60) || 'SurveyDash') + '-draft.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
