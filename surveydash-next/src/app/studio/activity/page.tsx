import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { workspaceActivity } from '@/lib/workspace-activity';
import { activityLabels } from '@/lib/activity-model';
export default async function ActivityPage() {
  const user = await requireWorkspaceUser();
  const rows = await workspaceActivity(user.ownerId);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Riwayat aktivitas</h1>
          <p>
            100 tindakan terakhir pada workspace ini. Koreksi jawaban dan review lengkap tersedia pada survei
            terkait.
          </p>
        </div>
      </div>
      <div className="card" style={{ padding: 20, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Waktu (WIB)</th>
              <th>Tindakan</th>
              <th>Pelaku</th>
              <th>Referensi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{new Date(String(row.at)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                <td>{activityLabels[String(row.action)] ?? String(row.action)}</td>
                <td>{String(row.actor_name ?? row.actor)}</td>
                <td>{String(row.subject_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p>Belum ada aktivitas yang tercatat oleh fitur ini.</p>}
      </div>
    </>
  );
}
