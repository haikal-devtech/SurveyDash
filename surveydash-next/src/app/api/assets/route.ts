import { api, checkOrigin, readLimitedBody, requireUser } from '@/lib/http';
import { allowSubmission, AppError } from '@/lib/repository';
import { listAssets, uploadAsset } from '@/lib/asset-repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => listAssets((await requireUser()).id));
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    if (!(await allowSubmission(`assets:${user.id}`)))
      throw new AppError('Terlalu banyak unggahan. Coba lagi sebentar.', 429);
    const body = await readLimitedBody(request, 2_600_000);
    const form = await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: new Uint8Array(body),
    }).formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new AppError('Pilih berkas gambar.');
    return uploadAsset(user.id, file);
  });
}
