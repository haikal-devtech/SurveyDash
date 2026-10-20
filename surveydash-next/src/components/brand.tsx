import Image from 'next/image';

export function Brand() {
  return (
    <div className="brand">
      <Image
        className="brand-logo brand-logo-light"
        src="/brand/surveydash-studio-logo.png"
        width={784}
        height={145}
        alt="SurveyDash Studio"
        loading="eager"
        unoptimized
      />
      <span className="brand-logo-dark">
        <Image src="/brand/surveydash-app-icon.png" width={40} height={40} sizes="40px" alt="" />
        <span>
          SurveyDash<small>STUDIO</small>
        </span>
      </span>
    </div>
  );
}
