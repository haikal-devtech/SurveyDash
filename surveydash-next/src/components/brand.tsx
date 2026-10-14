import Image from 'next/image';

export function Brand() {
  return (
    <div className="brand">
      <Image
        className="brand-logo"
        src="/brand/surveydash-studio-logo.png"
        width={784}
        height={145}
        alt="SurveyDash Studio"
        loading="eager"
        unoptimized
      />
    </div>
  );
}
