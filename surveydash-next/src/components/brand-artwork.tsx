import Image from 'next/image';

/** Existing generated artwork, reused as decorative product art without raster effects. */
export function BrandArtwork({
  asset = 'hero',
  className = '',
  eager = false,
}: {
  asset?: 'hero' | 'create' | 'invite' | 'share' | 'results';
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={`brand-artwork ${className}`} data-motion-artwork="" aria-hidden="true">
      <span className="brand-artwork-halo" />
      <Image
        className="brand-artwork-image"
        src={`/brand/clay/${asset}.webp`}
        width={asset === 'hero' ? 1080 : 720}
        height={720}
        sizes="(max-width: 600px) 130px, (max-width: 900px) 220px, 350px"
        alt=""
        loading={eager ? 'eager' : 'lazy'}
      />
    </div>
  );
}
