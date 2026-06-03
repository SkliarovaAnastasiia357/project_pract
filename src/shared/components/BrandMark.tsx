import teamnovaLogoUrl from "../../assets/teamnova-logo.svg";

type BrandMarkProps = {
  caption?: string;
};

export function BrandMark({ caption }: BrandMarkProps) {
  return (
    <div className="brand-lockup">
      <img alt="" aria-hidden="true" className="brand-mark" src={teamnovaLogoUrl} />
      <div>
        <p className="brand-name">TEAMNOVA</p>
        {caption ? <p className="brand-caption">{caption}</p> : null}
      </div>
    </div>
  );
}
