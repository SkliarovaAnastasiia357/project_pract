type BrandMarkProps = {
  caption?: string;
};

export function BrandMark({ caption }: BrandMarkProps) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true" />
      <div>
        <p className="brand-name">TEAMNOVA</p>
        {caption ? <p className="brand-caption">{caption}</p> : null}
      </div>
    </div>
  );
}
