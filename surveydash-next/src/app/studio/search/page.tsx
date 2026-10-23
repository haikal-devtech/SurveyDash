import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listSurveys, listTemplates } from '@/lib/repository';
import { systemTemplates, templateLabels } from '@/lib/template-model';
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const query = (await searchParams).query?.trim().slice(0, 200) ?? '';
  const [surveys, templates] = await Promise.all([
    listSurveys(workspaceUser.ownerId),
    listTemplates(workspaceUser.ownerId),
  ]);
  const matches = (text: string) =>
    !!query && text.toLocaleLowerCase('id-ID').includes(query.toLocaleLowerCase('id-ID'));
  const foundSurveys = surveys.filter((s) => matches(`${s.title} ${s.institution}`));
  const foundTemplates = [...systemTemplates, ...templates].filter((t) =>
    matches(`${t.name} ${t.description}`),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Hasil pencarian</h1>
          <p>
            {query
              ? `Untuk “${query}” di workspace Anda.`
              : 'Ketik nama survei atau template di kolom pencarian.'}
          </p>
        </div>
      </div>
      <section className="card search-results">
        <h2>Survei · {foundSurveys.length}</h2>
        {foundSurveys.map((s) => (
          <Link key={s.id} href={`/studio/${s.id}`}>
            <strong>{s.title}</strong>
            <small>
              {s.institution || 'Survei pribadi'} · {s.responseCount ?? 0} respons
            </small>
          </Link>
        ))}
        {!foundSurveys.length && <p className="hint">Tidak ada survei yang cocok.</p>}
      </section>
      <section className="card search-results">
        <h2>Template · {foundTemplates.length}</h2>
        {foundTemplates.map((t) => (
          <Link key={t.id} href={`/studio/templates?query=${encodeURIComponent(t.name)}`}>
            <strong>{t.name}</strong>
            <small>{templateLabels[t.category]}</small>
          </Link>
        ))}
        {!foundTemplates.length && <p className="hint">Tidak ada template yang cocok.</p>}
      </section>
    </>
  );
}
