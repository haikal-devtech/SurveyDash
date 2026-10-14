'use client';
import Image from 'next/image';
import { useState } from 'react';
export function UserAvatar({ name, image }: { name: string; image?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const trusted = image && /^\/api\/account\/avatar\?id=[a-f0-9]{64}$/.test(image) && failed !== image;
  return (
    <span className="avatar">
      {name.slice(0, 1).toUpperCase()}
      {trusted && (
        <Image src={image} width={128} height={128} alt="" unoptimized onError={() => setFailed(image)} />
      )}
    </span>
  );
}
