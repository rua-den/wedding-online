export function VinylRecord({ groom, bride }: { groom: string; bride: string }) {
  return <div className="vinyl-stage" aria-label={`Đĩa than ${groom} và ${bride}`}>
    <div className="vinyl-record" aria-hidden="true">
      <div className="vinyl-grooves" />
      <div className="vinyl-label">
        <span>{groom}</span>
        <em>&amp;</em>
        <span>{bride}</span>
      </div>
      <div className="vinyl-hole" />
    </div>
  </div>;
}
