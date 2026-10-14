import sharp from 'sharp';
import { z } from 'zod';
import { api, checkOrigin, readLimitedBody, requireUser } from '@/lib/http';
import { auth } from '@/lib/auth';
import { getAsset, uploadAsset } from '@/lib/asset-repository';
import { AppError } from '@/lib/repository';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  let image: Response | undefined;
  const failure = await api(async () => {
    const user = await requireUser();
    const id = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(new URL(request.url).searchParams.get('id'));
    const asset = await getAsset(id, user.id);
    const bytes = await sharp(Buffer.from(String(asset.content), 'base64'))
      .resize(128, 128, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    image = new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    return null;
  });
  return image ?? failure;
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const body = await readLimitedBody(request, 2600000);
    const form = await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: new Uint8Array(body),
    }).formData();
    const file = form.get('image');
    if (!(file instanceof File)) throw new AppError('Pilih gambar untuk foto profil.');
    const asset = await uploadAsset(user.id, file);
    const image = '/api/account/avatar?id=' + asset.id;
    await auth.api.updateUser({ body: { image }, headers: request.headers });
    return { image };
  });
}
