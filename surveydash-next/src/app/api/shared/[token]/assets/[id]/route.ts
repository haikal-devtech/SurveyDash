import { api } from '@/lib/http';
import { getSharedAsset } from '@/lib/share-repository';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ token: string; id: string }> }) {
  try {
    const { token, id } = await context.params;
    const asset = await getSharedAsset(token, id);
    return new Response(new Uint8Array(Buffer.from(String(asset.content), 'base64')), {
      headers: {
        'Content-Type': String(asset.mime),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    return api(() => {
      throw error;
    });
  }
}
