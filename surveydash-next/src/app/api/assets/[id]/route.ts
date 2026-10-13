import { requireUser } from '@/lib/http';
import { getAsset } from '@/lib/asset-repository';
import { AppError } from '@/lib/repository';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const row = await getAsset((await context.params).id, user.id);
    return new Response(new Uint8Array(Buffer.from(String(row.content), 'base64')), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Gambar tidak tersedia.' },
      { status: error instanceof AppError ? error.status : 500 },
    );
  }
}
